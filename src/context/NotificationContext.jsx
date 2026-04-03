import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { playNotificationSound } from '../lib/sounds'
import { sendPushNotification } from '../lib/pushNotifications'

const NotificationContext = createContext({})

// Status metadata — exported so FloatingButtons can use same definitions
export const STATUS_META = {
  placed:           { emoji: '📋', label: 'Order Placed',     color: '#d97706' },
  preparing:        { emoji: '👨‍🍳', label: 'Preparing',        color: '#ea580c' },
  out_for_delivery: { emoji: '🛵', label: 'Out for Delivery', color: '#2563eb' },
  delivered:        { emoji: '✅', label: 'Delivered',         color: '#16a34a' },
  cancelled:        { emoji: '❌', label: 'Cancelled',         color: '#dc2626' },
}

// Statuses that should show in the floating bubble
const ACTIVE_STATUSES = ['placed', 'preparing', 'out_for_delivery']
// Terminal statuses — remove from activeOrders after a short delay so the
// popup can still show, but the persistent bubble disappears
const TERMINAL_STATUSES = ['delivered', 'cancelled']

export const NotificationProvider = ({ children }) => {
  const { user, isOwner } = useAuth()
  const [popups, setPopups] = useState([])
  // Active orders for status bubble — only in-progress orders, oldest first
  const [activeOrders, setActiveOrders] = useState([])
  const [dismissedBubble, setDismissedBubble] = useState(new Set())
  const orderStatusRef = useRef({})

  const addPopup = (popup) => setPopups(prev => [...prev, { ...popup, id: Date.now() + Math.random() }])
  const dismissTop = () => setPopups(prev => prev.slice(1))
  const dismissOrderBubble = (orderId) => setDismissedBubble(prev => new Set([...prev, orderId]))

  // Unlock audio on first interaction (required by browser)
  useEffect(() => {
    const unlock = () => { import('../lib/sounds').then(m => m.unlockAudio?.()); document.removeEventListener('click', unlock) }
    document.addEventListener('click', unlock)
    return () => document.removeEventListener('click', unlock)
  }, [])

  // ── USER: listen for order status changes on ALL pages ──────────────
  useEffect(() => {
    if (!user || isOwner) return

    // Fetch only ACTIVE (non-terminal) orders so the bubble shows current orders only
    supabase.from('orders')
      .select('id, order_id, status, items, created_at')
      .eq('user_id', user.id)
      .in('status', ACTIVE_STATUSES)          // ← KEY FIX: skip delivered/cancelled
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const rows = data || []
        rows.forEach(o => { orderStatusRef.current[o.id] = o.status })
        setActiveOrders(rows)
      })

    const ch = supabase.channel('global_user_orders_' + user.id)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        const prev = orderStatusRef.current[payload.new.id]
        const next = payload.new.status
        if (!next || prev === next) return
        orderStatusRef.current[payload.new.id] = next

        // Re-show the bubble when status changes — user dismissed the old status,
        // but a new status update should always reappear
        setDismissedBubble(current => {
          const updated = new Set(current)
          updated.delete(payload.new.id)
          return updated
        })

        if (TERMINAL_STATUSES.includes(next)) {
          // Show the popup first, then remove from active list after a delay
          // so the notification is still visible briefly
          setTimeout(() => {
            setActiveOrders(current => current.filter(o => o.id !== payload.new.id))
          }, 8000) // keep bubble for 8s after delivery/cancellation, then auto-remove
        } else {
          // Update status in active list
          setActiveOrders(current => {
            const exists = current.find(o => o.id === payload.new.id)
            if (exists) {
              return current.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o)
            }
            // New active order arrived — append oldest-first
            return [...current, payload.new]
          })
        }

        playNotificationSound('user')

        const label = next.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        const emoji = next === 'placed' ? '📋' : next === 'preparing' ? '👨‍🍳' : next === 'out_for_delivery' ? '🛵' : next === 'delivered' ? '✅' : '❌'
        const msg = next === 'preparing' ? "We're preparing your order! 👨‍🍳"
          : next === 'out_for_delivery' ? 'Your order is on the way! 🛵'
          : next === 'delivered' ? 'Enjoy your meal! 😋' : ''

        sendPushNotification(`Order #${payload.new.order_id}: ${label}`, msg)

        const itemsList = payload.new.items?.map(i => `${i.name} ×${i.qty}`).join(', ') || ''
        addPopup({
          type: 'order',
          title: 'Order Status Update',
          rows: [
            ['Order ID', `#${payload.new.order_id}`],
            ['Status', `${emoji} ${label}`],
            ...(itemsList ? [['Items', itemsList]] : []),
            ...(msg ? [['', msg]] : []),
          ],
          summary: label,
        })
      })
      // Catch newly placed orders (INSERT) so the bubble appears right after checkout
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        orderStatusRef.current[payload.new.id] = payload.new.status
        // Only add if it's an active status (shouldn't be terminal on insert, but be safe)
        if (ACTIVE_STATUSES.includes(payload.new.status)) {
          setActiveOrders(current => [...current, payload.new])
        }
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [user?.id, isOwner])

  // ── OWNER: listen for new orders + table bookings on ALL pages ──────
  useEffect(() => {
    if (!isOwner) return

    const ch = supabase.channel('global_owner_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
        playNotificationSound('owner')
        sendPushNotification(
          `🍽 New Order #${payload.new.order_id}`,
          `${payload.new.user_name} — ₹${payload.new.total}`
        )
        addPopup({
          type: 'order',
          title: 'New Food Order',
          rows: [
            ['Order ID', `#${payload.new.order_id}`],
            ['Customer', payload.new.user_name],
            ['Items', `${payload.new.items?.length || 0} item${payload.new.items?.length !== 1 ? 's' : ''}`],
            ['Total', `₹${payload.new.total}`],
          ],
          summary: `₹${payload.new.total}`,
        })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'table_bookings' }, async payload => {
        playNotificationSound('owner')
        let tableLabel = 'Table'
        try {
          const { data: t } = await supabase.from('tables').select('table_number').eq('id', payload.new.table_id).single()
          if (t) tableLabel = `Table ${t.table_number}`
        } catch {}
        sendPushNotification(
          `🪑 New Table Booking — ${tableLabel}`,
          `${payload.new.user_name || 'Customer'} — Arrival: ${payload.new.arrival_time}`
        )
        addPopup({
          type: 'booking',
          title: `New Table Booking`,
          rows: [
            ['Table', tableLabel],
            ['Customer', payload.new.user_name || 'Customer'],
            ['Phone', payload.new.user_phone || '—'],
            ['Arrival Time', payload.new.arrival_time],
            ...(payload.new.amount_paid > 0 ? [['Fee Paid', `₹${payload.new.amount_paid}`]] : []),
          ],
          summary: `${tableLabel} — Booking confirmed`,
        })
      })
      .subscribe()

    return () => supabase.removeChannel(ch)
  }, [isOwner])

  return (
    <NotificationContext.Provider value={{ popups, addPopup, dismissTop, activeOrders, dismissedBubble, dismissOrderBubble }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
