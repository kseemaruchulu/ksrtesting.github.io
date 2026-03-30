import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { playNotificationSound, unlockAudio } from '../lib/sounds'
import { sendPushNotification } from '../lib/pushNotifications'

const NotificationContext = createContext({})

export const NotificationProvider = ({ children }) => {
  const { user, isOwner } = useAuth()
  // Shared popup queue — works on ALL pages
  const [popups, setPopups] = useState([])
  const orderStatusRef = useRef({})

  const addPopup = (popup) => setPopups(prev => [...prev, { ...popup, id: Date.now() + Math.random() }])
  const dismissTop = () => setPopups(prev => prev.slice(1))

  // Unlock audio on first interaction (required by browser)
  useEffect(() => {
    const unlock = () => { unlockAudio(); document.removeEventListener('click', unlock) }
    document.addEventListener('click', unlock)
    return () => document.removeEventListener('click', unlock)
  }, [])

  // ── USER: listen for order status changes on ALL pages ──────────────
  useEffect(() => {
    if (!user || isOwner) return

    // Seed ref with current order statuses so we don't pop on first load
    supabase.from('orders')
      .select('id, status')
      .eq('user_id', user.id)
      .then(({ data }) => {
        ;(data || []).forEach(o => { orderStatusRef.current[o.id] = o.status })
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

        playNotificationSound('user')

        const label = next.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        const emoji = next === 'placed' ? '📋' : next === 'preparing' ? '👨‍🍳' : next === 'out_for_delivery' ? '🛵' : next === 'delivered' ? '✅' : '❌'
        const msg = next === 'preparing' ? "We're preparing your order! 👨‍🍳"
          : next === 'out_for_delivery' ? 'Your order is on the way! 🛵'
          : next === 'delivered' ? 'Enjoy your meal! 😋' : ''

        sendPushNotification(`Order #${payload.new.order_id}: ${label}`, msg)

        // Include ordered items in the popup
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
        // Fetch table number since payload only has table_id (UUID)
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
    <NotificationContext.Provider value={{ popups, addPopup, dismissTop }}>
      {children}
    </NotificationContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationContext)
