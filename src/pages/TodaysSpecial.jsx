import { useEffect, useState } from 'react'
import { Flame, Star, Clock, ShoppingCart, Plus, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import { useRestaurant } from '../context/RestaurantContext'
import toast from 'react-hot-toast'

export default function TodaysSpecial() {
  const [specials, setSpecials] = useState([])
  const [loading, setLoading] = useState(true)
  const [added, setAdded] = useState({})
  const { dispatch, items } = useCart()
  const { settings } = useRestaurant()

  useEffect(() => { fetchSpecials() }, [])

  const fetchSpecials = async () => {
    const { data, error } = await supabase
      .from('today_special')
      .select('*, menu_items(*)')
      .eq('is_active', true)
      .not('menu_item_id', 'is', null)
      .order('position')
    if (error) console.error('TodaysSpecial error:', error)
    setSpecials((data || []).filter(s => s.menu_items && s.special_price > 0))
    setLoading(false)
  }

  const handleAdd = (special) => {
    if (!settings.is_open) { toast.error('Restaurant is currently closed'); return }
    dispatch({ type: 'ADD', item: { ...special.menu_items, price: special.special_price } })
    setAdded(prev => ({ ...prev, [special.id]: true }))
    toast.success(`${special.menu_items.name} added to cart!`, { icon: '🛒' })
    setTimeout(() => setAdded(prev => ({ ...prev, [special.id]: false })), 2000)
  }

  if (loading) return <div className="pt-24 text-center text-gray-400 py-20">Loading...</div>

  if (specials.length === 0) return (
    <div className="pt-24 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🍽</div>
        <p className="text-gray-400 text-lg font-medium">No specials today</p>
        <p className="text-gray-300 text-sm mt-2">Check back later or browse the full menu</p>
      </div>
    </div>
  )

  return (
    <div className="pt-20 min-h-screen bg-cream-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 font-semibold px-5 py-2 rounded-full mb-4">
            <Flame size={16} /> Chef's Special Today
          </div>
          <h1 className="section-title">Today's Special Offers</h1>
          <p className="text-gray-400 mt-2">{specials.length} special item{specials.length !== 1 ? 's' : ''} today</p>
        </div>

        {/* List layout — same style as menu cards */}
        <div className="space-y-5">
          {specials.map((special, i) => {
            const item = special.menu_items
            const discount = special.original_price > special.special_price
              ? Math.round((1 - special.special_price / special.original_price) * 100) : 0
            const inCart = items.find(ci => ci.id === item.id)

            return (
              <div key={special.id} className="card overflow-hidden flex flex-col sm:flex-row hover:shadow-md transition-all duration-300 group">
                {/* Image — 4:3 */}
                <div className="relative sm:w-64 shrink-0">
                  <div className="aspect-[4/3] sm:h-full sm:aspect-auto overflow-hidden">
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop'}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  {discount > 0 && (
                    <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-xl shadow">
                      {discount}% OFF
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                    #{i + 1}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.is_veg
                          ? <span className="badge-veg"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Veg</span>
                          : <span className="badge-nonveg"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Non-Veg</span>
                        }
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{item.category}</span>
                      </div>
                    </div>

                    <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">{item.name}</h2>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">{item.description}</p>

                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                      {item.avg_rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star size={13} className="fill-yellow-400 text-yellow-400" />
                          <span className="font-medium text-gray-700">{Number(item.avg_rating).toFixed(1)}</span>
                          <span>rating</span>
                        </div>
                      )}
                      {item.delivery_time && (
                        <div className="flex items-center gap-1">
                          <Clock size={13} />
                          <span>{item.delivery_time} min</span>
                        </div>
                      )}
                    </div>

                    {special.special_note && (
                      <div className="bg-primary-50 border border-primary-100 rounded-xl px-3 py-2 mb-4">
                        <p className="text-primary-700 text-xs font-medium">📝 {special.special_note}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-display font-bold text-primary-600">₹{special.special_price}</span>
                      {special.original_price > 0 && (
                        <span className="text-gray-400 line-through text-sm">₹{special.original_price}</span>
                      )}
                    </div>

                    {inCart ? (
                      <div className="flex items-center gap-2 bg-primary-50 rounded-xl px-3 py-1.5">
                        <button onClick={() => dispatch({ type: 'DECREMENT', id: item.id })} className="w-7 h-7 flex items-center justify-center bg-primary-600 text-white rounded-full font-bold hover:bg-primary-700 transition-colors">−</button>
                        <span className="text-primary-700 font-bold w-6 text-center">{inCart.qty}</span>
                        <button onClick={() => dispatch({ type: 'INCREMENT', id: item.id })} className="w-7 h-7 flex items-center justify-center bg-primary-600 text-white rounded-full font-bold hover:bg-primary-700 transition-colors">+</button>
                      </div>
                    ) : (
                      <button onClick={() => handleAdd(special)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${added[special.id] ? 'bg-green-500 text-white' : 'bg-primary-600 hover:bg-primary-700 text-white'}`}>
                        {added[special.id] ? <><Check size={16} /> Added</> : <><ShoppingCart size={16} /> Add to Cart</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
