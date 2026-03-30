import { useState, useEffect, useRef } from 'react'
import { Star, Clock, Plus, Check } from 'lucide-react'
import { useCart } from '../../context/CartContext'
import { useRestaurant } from '../../context/RestaurantContext'
import toast from 'react-hot-toast'

export default function MenuItemCard({ item }) {
  const { dispatch, items } = useCart()
  const { settings } = useRestaurant()
  const [justAdded, setJustAdded] = useState(false)
  const [ripple, setRipple] = useState(false)
  const timerRef = useRef(null)

  const inCart = items.find(i => i.id === item.id)

  // Clear justAdded when item is removed from cart entirely
  useEffect(() => {
    if (!inCart && justAdded) {
      setJustAdded(false)
    }
  }, [inCart])

  const handleAdd = (e) => {
    if (!settings.is_open) { toast.error('Restaurant is currently closed'); return }

    // Circle-expand ripple animation
    setRipple(true)
    setTimeout(() => setRipple(false), 600)

    dispatch({ type: 'ADD', item })
    setJustAdded(true)
    toast.success(`${item.name} added to cart!`, { icon: '🛒' })

    // Clear the "Added" flash after 1.5s — but only clear if still in cart
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setJustAdded(false), 1500)
  }

  return (
    <div className="card group hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={item.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-2 left-2">
          {item.is_veg ? (
            <span className="badge-veg"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Veg</span>
          ) : (
            <span className="badge-nonveg"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Non-Veg</span>
          )}
        </div>
        {item.category && (
          <div className="absolute top-2 right-2">
            <span className="text-xs bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">{item.category}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display font-semibold text-gray-900 text-lg leading-tight">{item.name}</h3>
          <span className="text-primary-600 font-bold text-lg shrink-0">₹{item.price}</span>
        </div>

        {item.description && (
          <p className="text-gray-500 text-sm leading-relaxed mb-3 line-clamp-2">{item.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {item.avg_rating > 0 && (
              <div className="flex items-center gap-1">
                <Star size={13} className="fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-gray-700">{Number(item.avg_rating).toFixed(1)}</span>
              </div>
            )}
            {item.delivery_time && (
              <div className="flex items-center gap-1">
                <Clock size={13} />
                <span>{item.delivery_time} min</span>
              </div>
            )}
          </div>

          {inCart ? (
            /* Qty controls — shown when item is in cart */
            <div className="flex items-center gap-2 bg-primary-50 rounded-xl px-3 py-1.5">
              <button
                onClick={() => dispatch({ type: 'DECREMENT', id: item.id })}
                className="w-6 h-6 flex items-center justify-center bg-primary-600 text-white rounded-full text-lg font-bold leading-none hover:bg-primary-700 transition-colors"
              >−</button>
              <span className="text-primary-700 font-bold text-sm min-w-[16px] text-center">{inCart.qty}</span>
              <button
                onClick={() => dispatch({ type: 'INCREMENT', id: item.id })}
                className="w-6 h-6 flex items-center justify-center bg-primary-600 text-white rounded-full text-lg font-bold leading-none hover:bg-primary-700 transition-colors"
              >+</button>
            </div>
          ) : (
            /* Add button — circle-expand style */
            <div className="relative">
              {/* Ripple circle */}
              {ripple && (
                <span
                  className="absolute inset-0 rounded-xl bg-primary-400 opacity-40 pointer-events-none"
                  style={{ animation: 'circleExpand 0.6s ease-out forwards' }}
                />
              )}
              <button
                onClick={handleAdd}
                className={`relative flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200
                  ${justAdded
                    ? 'bg-green-500 text-white scale-95'
                    : 'bg-primary-600 hover:bg-primary-500 text-white'}`}
              >
                {justAdded ? <Check size={14} /> : <Plus size={14} />}
                {justAdded ? 'Added!' : 'Add'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
