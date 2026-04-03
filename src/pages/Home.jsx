import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Star, ArrowRight, Flame, ChevronRight, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useRestaurant } from '../context/RestaurantContext'
import { useCart } from '../context/CartContext'
import MenuItemCard from '../components/ui/MenuItemCard'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { label: 'Starters', emoji: '🥗' }, { label: 'Mains', emoji: '🍱' },
  { label: 'Burgers', emoji: '🍔' }, { label: 'Pizza', emoji: '🍕' },
  { label: 'Desserts', emoji: '🍰' }, { label: 'Drinks', emoji: '🥤' },
]

function SpecialCarousel({ specials }) {
  const [current, setCurrent] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const [direction, setDirection] = useState('right')
  const timerRef  = useRef(null)
  const lockedRef = useRef(false)
  const { settings } = useRestaurant()
  const { dispatch } = useCart()

  // ── WELCOME SLIDE (always first) ──────────────────────────────
  // Replace the URL below with your restaurant photo URL when ready
  const RESTAURANT_IMAGE_URL = 'https://blogger.googleusercontent.com/img/a/AVvXsEi28iA75XzWrEueweI-se3v6b3BUOSm1wbUTP415r_IpBY4yna0ORG03wipMTVpc1pSLCyBu5IysSSjig5K6ltGwbdzaS9Tfu0GgSqvIJrIOPqXwt14VptpL2y0xIOcjVIYsP2DLB0JbD6YrZ4k6TkNozhz0jX4pTvQFpMD7leaW_xE3QTywm600m0OHsI'
  // ─────────────────────────────────────────────────────────────

  // Prepend welcome slide to specials
  const allSlides = [{ _isWelcome: true }, ...specials]

  const resetTimer = () => {
    clearInterval(timerRef.current)
    if (allSlides.length <= 1) return
    timerRef.current = setInterval(() => navigate('right'), 5500)
  }

  useEffect(() => {
    resetTimer()
    return () => clearInterval(timerRef.current)
  }, [allSlides.length])

  const navigate = (dir, targetIdx) => {
    if (lockedRef.current) return
    lockedRef.current = true
    clearInterval(timerRef.current)
    setCurrent(prev => {
      const next = targetIdx !== undefined
        ? targetIdx
        : dir === 'right'
          ? (prev + 1) % allSlides.length
          : (prev - 1 + allSlides.length) % allSlides.length
      if (next === prev) { lockedRef.current = false; return prev }
      setDirection(dir)
      setAnimKey(k => k + 1)
      return next
    })
    setTimeout(() => { lockedRef.current = false; resetTimer() }, 500)
  }

  const touchStartX = useRef(null)
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchEnd   = (e) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) navigate(diff > 0 ? 'right' : 'left')
    touchStartX.current = null
  }

  const slide = allSlides[current]
  const animClass = direction === 'right' ? 'carousel-enter-right' : 'carousel-enter-left'

  // ── Compute special slide data outside JSX to keep JSX clean ──
  const s = !slide._isWelcome ? slide : null
  const item = s?.menu_items ?? null
  const disc = s && s.original_price && s.special_price
    ? Math.round((1 - s.special_price / s.original_price) * 100) : 0
  const handleOrder = () => {
    if (!settings.is_open) { toast.error('Restaurant is currently closed'); return }
    dispatch({ type: 'ADD', item: { ...item, price: s.special_price } })
    toast.success(`${item.name} added to cart!`, { icon: '🛒' })
  }

  return (
    <section
      className="bg-cream-50 py-6 px-2 sm:px-4 lg:px-6"
      style={{ overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Arrow + Card + Arrow */}
      <div className="flex items-center gap-2 sm:gap-3 max-w-7xl mx-auto">

        {/* LEFT ARROW */}
        <button
          onClick={() => navigate('left')}
          disabled={allSlides.length <= 1}
          className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white border-2 border-primary-200 text-primary-600 shadow-md hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all active:scale-95 disabled:opacity-30 z-10"
        >
          <ChevronLeft size={22} />
        </button>

        {/* ── SLIDE — rendered as plain JSX (no sub-component) to prevent remount glitch ── */}
        {slide._isWelcome ? (
          // WELCOME SLIDE
          <div
            key={animKey}
            className={`flex-1 min-w-0 overflow-hidden rounded-3xl shadow-lg border border-gray-100
              flex flex-col lg:flex-row bg-white ${animClass}`}
          >
            {/* Image */}
            <div className="relative w-full lg:w-[55%] shrink-0" style={{ aspectRatio: '16/9' }}>
              {RESTAURANT_IMAGE_URL !== 'YOUR_RESTAURANT_IMAGE_URL_HERE'
                ? <img src={RESTAURANT_IMAGE_URL} alt={settings.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-primary-100 via-orange-50 to-cream-100 flex flex-col items-center justify-center gap-3">
                    <span className="text-7xl">🏪</span>
                    <span className="text-gray-400 text-sm font-medium">Restaurant photo coming soon</span>
                  </div>
              }
            </div>

            {/* Welcome text */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-10 text-center bg-gradient-to-br from-cream-50 to-orange-50">
              <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4 shadow-sm">
                <span>✨</span> Welcome
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-3">
                {settings.name || 'Our Restaurant'}
              </h1>
              <p className="text-gray-500 text-sm sm:text-base leading-relaxed mb-6 max-w-xs">
                Handcrafted dishes made with love, fresh ingredients, and a pinch of tradition.
              </p>
              <Link to="/menu" className="btn-primary flex items-center gap-2 text-sm">
                View Full Menu <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        ) : item ? (
          // SPECIAL ITEM SLIDE
          <div
            key={animKey}
            className={`flex-1 min-w-0 overflow-hidden rounded-3xl shadow-lg border border-gray-100
              flex flex-col lg:flex-row bg-white ${animClass}`}
          >
            {/* Image */}
            <div className="relative w-full lg:w-[55%] shrink-0" style={{ aspectRatio: '16/9' }}>
              {item.image_url
                ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-gradient-to-br from-primary-100 to-orange-100 flex items-center justify-center text-8xl">🍽</div>
              }
              <div className="absolute top-3 left-3">
                {item.is_veg
                  ? <span className="badge-veg shadow-sm"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Veg</span>
                  : <span className="badge-nonveg shadow-sm"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Non-Veg</span>
                }
              </div>
              {disc > 0 && (
                <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-xl shadow">
                  {disc}% OFF
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 flex flex-col justify-between p-5 sm:p-6 lg:p-8 bg-white">
              <div>
                {/* Chef special label */}
                <div className="inline-flex items-center gap-1.5 bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1 rounded-full mb-3">
                  <Flame size={11} /> Chef's Special
                </div>
                {item.avg_rating > 0 && (
                  <div className="flex items-center gap-1 mb-3">
                    {[1,2,3,4,5].map(star => (
                      <Star key={star} size={14}
                        className={star <= Math.round(item.avg_rating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'} />
                    ))}
                    <span className="text-sm text-gray-500 ml-1">{Number(item.avg_rating).toFixed(1)}</span>
                  </div>
                )}
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-2">{item.name}</h2>
                {item.description && (
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 mb-4">{item.description}</p>
                )}
              </div>
              <div>
                <div className="flex items-center flex-wrap gap-2 mb-4">
                  <span className="text-3xl font-display font-bold text-primary-600">₹{s.special_price}</span>
                  {s.original_price > 0 && <span className="text-base text-gray-400 line-through">₹{s.original_price}</span>}
                  {disc > 0 && <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">{disc}% OFF</span>}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <button onClick={handleOrder} className="btn-primary flex items-center gap-2 text-sm">
                    Order Now <ArrowRight size={15} />
                  </button>
                  <Link to="/menu" className="btn-secondary text-sm">View Menu</Link>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* RIGHT ARROW */}
        <button
          onClick={() => navigate('right')}
          disabled={allSlides.length <= 1}
          className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-white border-2 border-primary-200 text-primary-600 shadow-md hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all active:scale-95 disabled:opacity-30 z-10"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* DOTS */}
      {allSlides.length > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {allSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => navigate(i > current ? 'right' : 'left', i)}
              className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'bg-primary-600 w-7' : 'bg-gray-300 w-2'}`}
            />
          ))}
        </div>
      )}
    </section>
  )
}


export default function Home() {
  const { settings } = useRestaurant()
  const [specials, setSpecials] = useState([])
  const [topRated, setTopRated] = useState([])
  const [testimonials, setTestimonials] = useState([])

  useEffect(() => {
    fetchSpecials(); fetchTopRated(); fetchTestimonials()
  }, [])

  const fetchSpecials = async () => {
    const { data, error } = await supabase
      .from('today_special')
      .select('*, menu_items(*)')
      .eq('is_active', true)
      .not('menu_item_id', 'is', null)
      .order('position')
      .limit(5)
    if (error) { console.error('Specials fetch error:', error); return }
    setSpecials((data || []).filter(s => s.menu_items && s.special_price > 0))
  }

  const fetchTopRated = async () => {
    const { data } = await supabase.from('menu_items').select('*').eq('is_available', true).order('avg_rating', { ascending: false }).limit(6)
    setTopRated(data || [])
  }

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from('ratings')
      .select('*, profiles(name, avatar_url), menu_items(name)')
      .eq('show_in_testimonial', true)
      .eq('is_hidden', false)
      .order('rating', { ascending: false })
      .limit(3)
    setTestimonials(data || [])
  }

  return (
    <div className="pt-16">
      <SpecialCarousel specials={specials} />

      {/* Categories */}
      <section className="py-10 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto gap-6 justify-center pb-2">
            {CATEGORIES.map(cat => (
              <Link key={cat.label} to={`/menu?category=${cat.label}`} className="flex flex-col items-center gap-2 min-w-[72px] group">
                <div className="w-16 h-16 bg-cream-100 group-hover:bg-primary-100 rounded-2xl flex items-center justify-center text-3xl transition-colors shadow-sm">{cat.emoji}</div>
                <span className="text-xs font-medium text-gray-600 group-hover:text-primary-600 transition-colors">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Top Rated */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="section-title">Top Rated Dishes</h2>
              <p className="text-gray-500 mt-2">Loved by our customers</p>
            </div>
            <Link to="/menu" className="flex items-center gap-1 text-primary-600 font-medium hover:gap-2 transition-all">View all <ChevronRight size={16} /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {topRated.map(item => <MenuItemCard key={item.id} item={item} />)}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="py-16 bg-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="section-title text-white text-center mb-2">Loved by Thousands</h2>
            <p className="text-gray-400 text-center mb-10">What our customers say</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map(t => (
                <div key={t.id} className="bg-gray-800 rounded-2xl p-6">
                  <div className="flex mb-3">{[...Array(5)].map((_, i) => <Star key={i} size={14} className={i < t.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-600'} />)}</div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-4">"{t.comment}"</p>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">{t.profiles?.name?.[0] || 'U'}</div>
                    <div>
                      <p className="text-white text-sm font-medium">{t.profiles?.name || 'Customer'}</p>
                      <p className="text-gray-500 text-xs">{t.menu_items?.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link to="/testimonials" className="btn-secondary border-gray-600 text-gray-300 hover:bg-gray-800">See All Reviews</Link>
            </div>
          </div>
        </section>
      )}

      {/* About snippet */}
      <section className="py-16 bg-cream-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="section-title mb-4">About {settings.name}</h2>
              <p className="text-gray-600 leading-relaxed mb-6">{settings.about}</p>
              <Link to="/about" className="btn-primary inline-flex items-center gap-2">Learn More <ArrowRight size={16} /></Link>
            </div>
            <div className="bg-white rounded-3xl p-8 shadow-sm">
              <div className="grid grid-cols-2 gap-6 text-center">
                {[
                  [settings.stat_customers || '500+', 'Happy Customers'],
                  [settings.stat_items || '50+', 'Menu Items'],
                  [settings.stat_rating || '4.8★', 'Average Rating'],
                  [settings.stat_delivery || '30min', 'Avg Delivery'],
                ].map(([val, label]) => (
                  <div key={label}>
                    <div className="font-display text-3xl font-bold text-primary-600 mb-1">{val}</div>
                    <div className="text-sm text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
