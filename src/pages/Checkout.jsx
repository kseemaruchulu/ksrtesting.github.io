import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { playNotificationSound } from '../lib/sounds'
import toast from 'react-hot-toast'
import { CheckCircle, CreditCard } from 'lucide-react'

export default function Checkout() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { dispatch } = useCart()
  const [processing, setProcessing] = useState(false)
  const [paid, setPaid] = useState(false)

  if (!state) { navigate('/cart'); return null }

  const { address, phone, mapsLink, total, subtotal, deliveryCharge, taxAmount, discount, coupon, items, areaName } = state

 const handlePayment = async () => {
  setProcessing(true)
  try {
    // Simulate payment processing
    await new Promise(r => setTimeout(r, 2000))

    // Call server-side validation function
    const { data, error } = await supabase.rpc('create_validated_order', {
      p_user_id: user.id,
      p_items: items.map(i => ({ id: i.id, name: i.name, qty: i.qty })),
      p_address: address,
      p_phone: phone,
      p_maps_link: mapsLink || null,
      p_coupon_code: coupon?.code || null,
      p_area_name: areaName || null
    })

    if (error) throw error
    
    if (!data.success) {
      throw new Error(data.error || 'Order creation failed')
    }

    // Clear cart
    dispatch({ type: 'CLEAR' })
    setPaid(true)
    playNotificationSound('user')
    toast.success('Order placed successfully!', { icon: '🎉' })

    setTimeout(() => navigate('/track-order'), 3000)
  } catch (err) {
    console.error('Payment error:', err)
    toast.error(err.message || 'Payment failed. Please try again.')
  }
  setProcessing(false)
}


  if (paid) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-center animate-slide-up">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="font-display text-3xl font-bold text-gray-900 mb-2">Order Placed! 🎉</h2>
          <p className="text-gray-600 mb-4">Redirecting to track your order...</p>
          <div className="animate-pulse text-primary-600">⏳ Please wait...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20 min-h-screen bg-cream-50">
      <div className="max-w-xl mx-auto px-4 py-12">
        <h1 className="section-title text-center mb-8">Confirm & Pay</h1>

        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm mb-4">
            {items.map(i => (
              <div key={i.id} className="flex justify-between text-gray-600">
                <span>{i.name} × {i.qty}</span>
                <span>₹{i.price * i.qty}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{subtotal}</span></div>
            <div className="flex justify-between text-gray-500"><span>Tax</span><span>₹{taxAmount}</span></div>
            <div className="flex justify-between text-gray-500"><span>Delivery</span><span>₹{deliveryCharge}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>−₹{discount}</span></div>}
            <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-100">
              <span>Total</span><span>₹{total}</span>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
            ℹ️ <strong>Note:</strong> Final amount will be validated server-side to ensure accurate pricing.
          </div>
        </div>

        <div className="card p-6 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Delivery To</h2>
          <p className="text-gray-600 text-sm">{address}</p>
          <p className="text-gray-600 text-sm mt-1">📞 {phone}</p>
        </div>

        <button
          onClick={handlePayment}
          disabled={processing}
          className="btn-primary w-full text-xl py-5 flex items-center justify-center gap-3 disabled:opacity-70"
        >
          <CreditCard size={22} />
          {processing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing Payment...
            </span>
          ) : `Pay ₹${total}`}
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">🔒 100% secure payment with server-side validation</p>
      </div>
    </div>
  )
}
