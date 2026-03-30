import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2, ShoppingBag, Tag, MapPin, Phone, Lock, ChevronDown, ChevronUp, Check, Navigation } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useRestaurant } from '../context/RestaurantContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

/* ─── Coupon Section (unchanged) ─────────────────────────── */
function CouponSection({ subtotal, deliveryCharge, appliedCoupon, onApply, onRemove }) {
  const [coupons, setCoupons] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.from('coupons').select('*').eq('is_active', true).then(({ data }) => setCoupons(data || []))
  }, [])

  const getDiscount = (c) => {
    if (c.discount_type === 'free_delivery') return deliveryCharge
    if (c.discount_type === 'percent')
      return Math.min(Math.round(subtotal * c.discount_value / 100), c.max_discount || Infinity)
    return c.discount_value
  }
  const isApplicable = (c) => subtotal >= (c.min_order || 0)
  const amountNeeded = (c) => Math.max(0, (c.min_order || 0) - subtotal)

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2 font-medium text-gray-800">
          <Tag size={16} className="text-primary-600" />
          {appliedCoupon
            ? <span className="text-green-700">✓ <span className="font-bold">{appliedCoupon.code}</span> applied — you save ₹{getDiscount(appliedCoupon)}</span>
            : <span>View Available Coupons ({coupons.length})</span>}
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {coupons.length === 0 && <p className="text-center text-gray-400 text-sm py-6">No coupons available right now</p>}
          {coupons.map(c => {
            const applicable = isApplicable(c)
            const isApplied  = appliedCoupon?.id === c.id
            const needed     = amountNeeded(c)
            const discount   = getDiscount(c)
            return (
              <div key={c.id} className={`p-4 transition-colors ${applicable ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${applicable ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-500'}`}>{c.code}</span>
                      {applicable && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-medium">Applicable ✓</span>}
                    </div>
                    <p className={`text-sm font-medium ${applicable ? 'text-green-700' : 'text-gray-400'}`}>{c.description}</p>
                    {!applicable && needed > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Shop ₹{needed} more to unlock</span>
                          <span>₹{subtotal} / ₹{c.min_order}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-primary-400 rounded-full" style={{ width: `${Math.min(100, (subtotal / c.min_order) * 100)}%` }} />
                        </div>
                      </div>
                    )}
                    {applicable && (
                      <p className="text-xs text-green-600 mt-1">
                        {c.discount_type === 'free_delivery' ? '🚚 Free delivery!' :
                          c.discount_type === 'percent' ? `Save ${c.discount_value}% = ₹${discount} off` : `Save ₹${discount}`}
                      </p>
                    )}
                  </div>
                  {applicable && (isApplied
                    ? <button onClick={onRemove} className="text-xs text-red-500 border border-red-200 px-3 py-1.5 rounded-lg shrink-0">Remove</button>
                    : <button onClick={() => onApply(c, discount)} className="text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1"><Check size={12} /> Apply</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Map Pin Drop Component ──────────────────────────────── */
function MapPinDrop({ onLocationSelect, selectedPin }) {
  const [detecting, setDetecting] = useState(false)

  const detectLocation = () => {
    if (!navigator.geolocation) { toast.error('GPS not supported on this device'); return }
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords
        onLocationSelect({ lat, lng })
        setDetecting(false)
        toast.success('Location detected!')
      },
      err => {
        setDetecting(false)
        if (err.code === 1) toast.error('Location permission denied. Please enable GPS and try again.')
        else toast.error('Could not get location. Try again.')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const mapsUrl = selectedPin
    ? `https://www.google.com/maps?q=${selectedPin.lat},${selectedPin.lng}`
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
          <MapPin size={14} className="text-primary-600" /> Drop your location pin *
        </label>
        {selectedPin && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary-600 underline">
            Verify on Maps ↗
          </a>
        )}
      </div>

      {/* Auto-detect button */}
      <button
        type="button"
        onClick={detectLocation}
        disabled={detecting}
        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-all
          ${selectedPin
            ? 'border-green-400 bg-green-50 text-green-700'
            : 'border-dashed border-primary-300 text-primary-700 hover:bg-primary-50'}`}
      >
        <Navigation size={16} className={detecting ? 'animate-spin' : ''} />
        {detecting ? 'Detecting...' : selectedPin ? '✓ Location pinned — tap to re-detect' : 'Tap to auto-detect my location (GPS)'}
      </button>

      {selectedPin && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800 space-y-1">
          <p className="font-semibold">📍 Pin dropped successfully</p>
          <p className="text-green-600">Lat: {selectedPin.lat.toFixed(6)}, Lng: {selectedPin.lng.toFixed(6)}</p>
          <p className="text-green-600">Delivery person will navigate directly to this pin.</p>
        </div>
      )}

      {/* Manual Maps link fallback */}
      <details className="text-xs text-gray-400">
        <summary className="cursor-pointer hover:text-gray-600">Can't use GPS? Paste a Google Maps link instead</summary>
        <div className="mt-2">
          <input
            className="input text-sm mt-1"
            placeholder="Paste Google Maps share link..."
            onChange={e => {
              // Extract lat/lng from Google Maps URL
              const url = e.target.value
              const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ||
                            url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/)
              if (match) {
                onLocationSelect({ lat: parseFloat(match[1]), lng: parseFloat(match[2]) })
                toast.success('Location extracted from link!')
              }
            }}
          />
        </div>
      </details>
    </div>
  )
}

/* ─── Main Cart Page ──────────────────────────────────────── */
export default function Cart() {
  const { items, dispatch, subtotal, itemCount, coupon, discount } = useCart()
  const { user, profile } = useAuth()
  const { settings } = useRestaurant()
  const navigate = useNavigate()

  const [pin, setPin]         = useState(null)   // { lat, lng }
  const [flatNo, setFlatNo]   = useState('')
  const [area, setArea]       = useState(null)
  const [areas, setAreas]     = useState([])
  const [phone, setPhone]     = useState('')
  const [loading, setLoading] = useState(false)

  const baseDeliveryCharge = area ? Number(area.delivery_charge) : (settings.delivery_charge || 40)
  const deliveryCharge = coupon?.discount_type === 'free_delivery' ? 0 : baseDeliveryCharge
  const cgst       = settings.cgst_percent || 0
  const sgst       = settings.sgst_percent || 0
  const taxPercent = cgst + sgst || settings.tax_percent || 0
  const taxAmount  = Math.round((subtotal * taxPercent) / 100)
  const total      = subtotal + deliveryCharge + taxAmount - (coupon?.discount_type === 'free_delivery' ? 0 : (discount || 0))

  // Full address string for storage
  const fullAddress = [flatNo, area?.name, pin ? `GPS:${pin.lat.toFixed(6)},${pin.lng.toFixed(6)}` : ''].filter(Boolean).join(' | ')
  const mapsLink    = pin ? `https://www.google.com/maps?q=${pin.lat},${pin.lng}` : ''

  useEffect(() => {
    if (profile) setPhone(profile.phone || '')
    supabase.from('delivery_areas').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => setAreas(data || []))
  }, [profile])

  const handleApplyCoupon  = (c, amt) => { dispatch({ type: 'APPLY_COUPON', coupon: c, discount: amt }); toast.success(`Coupon ${c.code} applied!`, { icon: '🏷️' }) }
  const handleRemoveCoupon = ()       => { dispatch({ type: 'REMOVE_COUPON' }); toast.success('Coupon removed') }

  const handleProceed = async () => {
    if (!user)              { toast.error('Please login first'); navigate('/login'); return }
    if (!settings.is_open)  { toast.error('Restaurant is currently closed'); return }
    if (items.length === 0) { toast.error('Your cart is empty'); return }
    if (!pin)               { toast.error('Please drop your location pin first'); return }
    if (!flatNo.trim())     { toast.error('Please enter your flat / house number'); return }
    if (!area)              { toast.error('Please select your delivery area'); return }
    if (!phone.trim())      { toast.error('Please enter your phone number'); return }
    setLoading(true)
    await supabase.from('profiles').update({ phone: phone.trim() }).eq('id', user.id)
    navigate('/checkout', {
      state: { address: fullAddress, phone, mapsLink, total, subtotal, deliveryCharge, taxAmount, discount, coupon, items, cgst, sgst, taxPercent, areaName: area?.name }
    })
    setLoading(false)
  }

  if (items.length === 0) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-6">Add some delicious items to get started</p>
          <Link to="/menu" className="btn-primary">Browse Menu</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20 min-h-screen bg-cream-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="section-title mb-8">Your Cart & Checkout</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <div className="lg:col-span-2 space-y-4">

            {/* Cart Items */}
            <div className="card p-6">
              <h2 className="font-display text-xl font-semibold mb-5 flex items-center gap-2">
                <ShoppingBag size={20} className="text-primary-600" /> Review Items ({itemCount})
              </h2>
              <div className="divide-y divide-gray-100">
                {items.map(item => (
                  <div key={item.id} className="py-4 flex items-center gap-4">
                    <img src={item.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=80&h=60&fit=crop'}
                      alt={item.name} className="w-20 h-16 object-cover rounded-xl" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                      <p className="text-sm text-gray-500">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-2 bg-primary-50 rounded-xl px-3 py-1.5">
                      <button onClick={() => dispatch({ type: 'DECREMENT', id: item.id })} className="w-7 h-7 flex items-center justify-center bg-primary-600 text-white rounded-full text-lg font-bold leading-none">−</button>
                      <span className="text-primary-700 font-bold w-6 text-center">{item.qty}</span>
                      <button onClick={() => dispatch({ type: 'INCREMENT', id: item.id })} className="w-7 h-7 flex items-center justify-center bg-primary-600 text-white rounded-full text-lg font-bold leading-none">+</button>
                    </div>
                    <div className="text-right min-w-[70px]">
                      <p className="font-bold text-primary-600">₹{item.price * item.qty}</p>
                      <button onClick={() => dispatch({ type: 'REMOVE', id: item.id })} className="text-red-400 hover:text-red-600 mt-1"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupons */}
            <CouponSection subtotal={subtotal} deliveryCharge={baseDeliveryCharge} appliedCoupon={coupon} onApply={handleApplyCoupon} onRemove={handleRemoveCoupon} />

            {/* Delivery Details */}
            <div className="card p-6 space-y-5">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <MapPin size={20} className="text-primary-600" /> Delivery Details
              </h2>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                  <Phone size={13} /> Phone Number *
                </label>
                <input value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="98765 43210" maxLength={10} />
              </div>

              {/* Flat / House No */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Flat / House No. *</label>
                <input value={flatNo} onChange={e => setFlatNo(e.target.value)} className="input" placeholder="e.g. 4B, Sunrise Apartments" />
              </div>

              {/* Area dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <MapPin size={13} /> Delivery Area * <span className="text-gray-400 font-normal text-xs">(sets delivery charge)</span>
                </label>
                {areas.length === 0 ? (
                  <div className="input bg-gray-50 text-gray-400 text-sm">No delivery areas configured yet</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {areas.map(a => (
                      <button key={a.id} type="button" onClick={() => setArea(a)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-left transition-all
                          ${area?.id === a.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300 bg-white'}`}>
                        <span className="font-medium text-gray-800 text-sm">{a.name}</span>
                        <span className={`text-sm font-semibold ${area?.id === a.id ? 'text-primary-600' : 'text-gray-500'}`}>
                          {Number(a.delivery_charge) === 0 ? 'Free' : `₹${a.delivery_charge}`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* GPS Pin Drop */}
              <MapPinDrop onLocationSelect={setPin} selectedPin={pin} />

              {/* Summary of what delivery person sees */}
              {pin && flatNo && area && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                  <p className="font-semibold text-blue-800 mb-1">📦 Delivery info (as seen by delivery person)</p>
                  <p className="text-blue-700">{flatNo} · {area.name}</p>
                  <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 underline mt-1 inline-block">
                    🗺 Open exact location in Google Maps
                  </a>
                </div>
              )}
            </div>

            {/* No-refund note */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <Lock size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                ⚠️ Orders once placed and payment confirmed <span className="font-bold">cannot be cancelled or refunded</span>. Review your order before proceeding.
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="font-display text-xl font-semibold mb-5">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal ({itemCount} items)</span><span>₹{subtotal}</span></div>
                {cgst > 0 && <div className="flex justify-between text-gray-600"><span>CGST ({cgst}%)</span><span>₹{Math.round(subtotal * cgst / 100)}</span></div>}
                {sgst > 0 && <div className="flex justify-between text-gray-600"><span>SGST ({sgst}%)</span><span>₹{Math.round(subtotal * sgst / 100)}</span></div>}
                {!cgst && !sgst && taxPercent > 0 && <div className="flex justify-between text-gray-600"><span>Tax ({taxPercent}%)</span><span>₹{taxAmount}</span></div>}
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  {coupon?.discount_type === 'free_delivery'
                    ? <span className="text-green-600 font-medium">FREE</span>
                    : <span>₹{deliveryCharge}</span>}
                </div>
                {discount > 0 && coupon?.discount_type !== 'free_delivery' && (
                  <div className="flex justify-between text-green-600"><span>Coupon ({coupon?.code})</span><span>−₹{discount}</span></div>
                )}
                <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg text-gray-900">
                  <span>Total</span><span>₹{total}</span>
                </div>
              </div>
              <button
                onClick={handleProceed}
                disabled={loading || !settings.is_open}
                className="btn-primary w-full mt-6 text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : `Proceed to Payment — ₹${total}`}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">🔒 Secure checkout</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
