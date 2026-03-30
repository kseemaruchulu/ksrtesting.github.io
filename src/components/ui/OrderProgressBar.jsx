import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { playNotificationSound } from '../../lib/sounds'
import { X, Package } from 'lucide-react'

const STATUS_STEPS = {
  placed: { label: 'Order Placed', percent: 10, emoji: '📋' },
  preparing: { label: 'Preparing', percent: 35, emoji: '👨‍🍳' },
  out_for_delivery: { label: 'Out for Delivery', percent: 70, emoji: '🛵' },
  delivered: { label: 'Delivered!', percent: 100, emoji: '✅' },
}

export default function OrderProgressBar() {
  const { user } = useAuth()
  const [activeOrder, setActiveOrder] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [prevStatus, setPrevStatus] = useState(null)

  useEffect(() => {
    if (!user) return
    fetchActiveOrder()

    const channel = supabase.channel('user_order_' + user.id)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `user_id=eq.${user.id}`,
      }, payload => {
        const order = payload.new
        if (['placed', 'preparing', 'out_for_delivery', 'delivered'].includes(order.status)) {
          if (order.status !== prevStatus) {
            playNotificationSound('user')
            setPrevStatus(order.status)
          }
          setActiveOrder(order)
          setDismissed(false)

          // Hide 1 hour after delivery
          if (order.status === 'delivered') {
            const deliveredAt = new Date(order.delivered_at || Date.now())
            const hideAt = deliveredAt.getTime() + 60 * 60 * 1000
            const now = Date.now()
            if (now >= hideAt) setActiveOrder(null)
            else setTimeout(() => setActiveOrder(null), hideAt - now)
          }
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const fetchActiveOrder = async () => {
    if (!user) return
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data && ['placed', 'preparing', 'out_for_delivery', 'delivered'].includes(data.status)) {
      if (data.status === 'delivered' && data.delivered_at) {
        const hideAt = new Date(data.delivered_at).getTime() + 60 * 60 * 1000
        if (Date.now() >= hideAt) return
      }
      setActiveOrder(data)
      setPrevStatus(data.status)
    }
  }

  if (!activeOrder || dismissed) return null

  const step = STATUS_STEPS[activeOrder.status] || STATUS_STEPS.placed
  const percent = step.percent

  return (
    <div className="order-progress-bar">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Package size={16} className="text-primary-600" />
            <span className="text-sm font-semibold text-gray-800">
              {step.emoji} {step.label}
            </span>
            <span className="text-xs text-gray-400 ml-1">#{activeOrder.order_id}</span>
          </div>
          <button onClick={() => setDismissed(true)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={14} className="text-gray-400" />
          </button>
        </div>
        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>Placed</span>
          <span>Preparing</span>
          <span>On the way</span>
          <span>Delivered</span>
        </div>
      </div>
    </div>
  )
}
