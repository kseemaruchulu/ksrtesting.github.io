import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatDateTime } from '../lib/utils'
import { Star, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_STEPS = [
  { key: 'placed', label: 'Order Placed', emoji: '📋', percent: 10 },
  { key: 'preparing', label: 'Preparing', emoji: '👨‍🍳', percent: 35 },
  { key: 'out_for_delivery', label: 'Out for Delivery', emoji: '🛵', percent: 70 },
  { key: 'delivered', label: 'Delivered', emoji: '✅', percent: 100 },
]

function RatingModal({ order, onClose, onSubmit }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const handleSubmit = () => {
    onSubmit({ rating, comment: comment.trim() })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-slide-up">
        <h2 className="font-display text-2xl font-bold mb-1">Rate Your Order</h2>
        <p className="text-gray-500 text-sm mb-6">Order #{order.order_id} · {order.items?.[0]?.name}</p>
        <p className="text-xs text-gray-400 mb-3">Tap a star to rate</p>
        <div className="flex gap-3 mb-6 justify-center">
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110 active:scale-95">
              <Star size={36} className={s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'} />
            </button>
          ))}
        </div>
        <p className="text-center text-sm font-medium text-gray-700 mb-4">
          {rating === 1 ? '😞 Poor' : rating === 2 ? '😐 Fair' : rating === 3 ? '🙂 Good' : rating === 4 ? '😊 Great' : '🤩 Excellent!'}
        </p>
        <textarea value={comment} onChange={e => setComment(e.target.value)}
          className="input resize-none mb-2" rows={3}
          placeholder="Write a comment (optional)..." />
        <p className="text-xs text-gray-400 mb-6">Your comment will appear in Testimonials if you write one.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} className="btn-primary flex-1">Submit Rating</button>
        </div>
      </div>
    </div>
  )
}

export default function TrackOrder() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [ratingOrder, setRatingOrder] = useState(null)

  // Keep local order list in sync with realtime updates from NotificationContext.
  // The popup + sound is handled globally by NotificationContext — no duplicate
  // channel needed here. We only subscribe to keep the progress bar live.
  useEffect(() => {
    if (!user) return

    fetchOrders()

    const channel = supabase
      .channel('trackorder_ui_sync_' + user.id)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${user.id}` },
        payload => {
          // Just update the local list so the progress bar moves — no popup/sound here
          setOrders(prev =>
            prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o)
          )
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    setLoading(false)
  }

  const submitRating = async ({ rating, comment, showInTestimonial }) => {
    const order = ratingOrder
    const insertData = {
      user_id: user.id,
      order_id: order.id,
      menu_item_id: order.items?.[0]?.id || null,
      rating,
      comment,
      show_in_testimonial: showInTestimonial,
      is_hidden: false,
    }
    const { error } = await supabase.from('ratings').insert(insertData).select()
    if (!error) {
      await supabase.from('orders').update({ has_rating: true }).eq('id', order.id)
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, has_rating: true } : o))
      // Update avg rating on menu item
      if (order.items?.[0]?.id) {
        const { data: allRatings } = await supabase
          .from('ratings')
          .select('rating')
          .eq('menu_item_id', order.items[0].id)
          .eq('is_hidden', false)
        if (allRatings?.length) {
          const avg = allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length
          await supabase.from('menu_items').update({ avg_rating: avg }).eq('id', order.items[0].id)
        }
      }
      toast.success('Thank you for your review! ⭐')
      setRatingOrder(null)
    } else {
      console.error('Rating insert error:', error)
      toast.error('Failed to submit: ' + error.message)
    }
  }

  const activeOrders = orders.filter(o => ['placed', 'preparing', 'out_for_delivery'].includes(o.status))
  const deliveredOrders = orders.filter(o => o.status === 'delivered')

  if (!user) return <div className="pt-24 text-center text-gray-500 py-20">Please login to track orders</div>

  return (
    <div className="pt-20 min-h-screen bg-cream-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="section-title mb-8 flex items-center gap-3"><Package size={32} className="text-primary-600" /> Track My Orders</h1>

        {loading ? <div className="text-center text-gray-400 py-20">Loading...</div> : (
          <>
            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div className="mb-10">
                <h2 className="font-display text-xl font-semibold mb-4 text-gray-800">🔴 Active Orders</h2>
                <div className="space-y-4">
                  {activeOrders.map(order => {
                    const stepIdx = STATUS_STEPS.findIndex(s => s.key === order.status)
                    const step = STATUS_STEPS[stepIdx] || STATUS_STEPS[0]
                    return (
                      <div key={order.id} className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <span className="text-sm text-gray-500">Order ID</span>
                            <div className="font-bold text-gray-900">#{order.order_id}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-primary-600 text-lg">₹{order.total}</div>
                            <div className="text-xs text-gray-400">{formatDateTime(order.created_at)}</div>
                          </div>
                        </div>
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-500 mb-2">
                            {STATUS_STEPS.map(s => (
                              <span key={s.key} className={`${s.key === order.status ? 'text-primary-600 font-semibold' : ''}`}>{s.emoji}</span>
                            ))}
                          </div>
                          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-1000" style={{ width: `${step.percent}%` }} />
                          </div>
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            {STATUS_STEPS.map(s => <span key={s.key}>{s.label}</span>)}
                          </div>
                        </div>
                        <div className="text-sm font-medium text-gray-700">
                          {step.emoji} {step.label}
                        </div>
                        <div className="mt-3 text-xs text-gray-500">
                          {order.items?.map(i => `${i.name} ×${i.qty}`).join(', ')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Delivered Orders */}
            {deliveredOrders.length > 0 && (
              <div>
                <h2 className="font-display text-xl font-semibold mb-4 text-gray-800">✅ Past Orders</h2>
                <div className="space-y-4">
                  {deliveredOrders.map(order => (
                    <div key={order.id} className="card p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-gray-900">#{order.order_id}</div>
                          <div className="text-xs text-gray-400 mb-2">{formatDate(order.created_at)}</div>
                          <div className="text-sm text-gray-600">{order.items?.map(i => `${i.name} ×${i.qty}`).join(', ')}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-primary-600">₹{order.total}</div>
                          {!order.has_rating && (
                            <button onClick={() => setRatingOrder(order)} className="mt-2 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1 rounded-full hover:bg-yellow-100 transition-colors">
                              ⭐ Rate Order
                            </button>
                          )}
                          {order.has_rating && <div className="text-xs text-green-600 mt-1">⭐ Rated</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {orders.length === 0 && (
              <div className="text-center py-20 text-gray-400">
                <Package size={48} className="mx-auto mb-3 opacity-30" />
                <p>No orders yet. Start ordering!</p>
              </div>
            )}
          </>
        )}
      </div>
      {ratingOrder && <RatingModal order={ratingOrder} onClose={() => setRatingOrder(null)} onSubmit={submitRating} />}
    </div>
  )
}
