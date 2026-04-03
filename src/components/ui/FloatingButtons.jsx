import { useState, useEffect } from 'react'
import { Phone, ChevronUp, X } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useRestaurant } from '../../context/RestaurantContext'
import { useAuth } from '../../context/AuthContext'
import { useNotifications, STATUS_META } from '../../context/NotificationContext'

export default function FloatingButtons() {
  const { settings } = useRestaurant()
  const { user, isOwner } = useAuth()
  const { activeOrders, dismissedBubble, dismissOrderBubble } = useNotifications()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)

  // Reset scroll state on every page navigation so arrow hides at page top
  useEffect(() => {
    setScrolled(window.scrollY > 300)
  }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const phoneRaw = (settings.phone || '').replace(/\s+/g, '')

  // Oldest active order that hasn't been dismissed — index 0 is oldest (ascending sort)
  const bubbleOrder = (!isOwner && user)
    ? activeOrders.find(o => !dismissedBubble.has(o.id)) ?? null
    : null

  const status = bubbleOrder?.status ?? null
  const meta = status ? (STATUS_META[status] ?? null) : null
  const isPulsing = status && status !== 'delivered' && status !== 'cancelled'

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col gap-3 items-center">

      {/* ── Order status bubble ── */}
      {bubbleOrder && meta && (
        <div className="relative">
          {/* Dismiss (×) button — top-left of bubble */}
          <button
            onClick={(e) => { e.stopPropagation(); dismissOrderBubble(bubbleOrder.id) }}
            aria-label="Dismiss order status"
            className="absolute -top-1.5 -left-1.5 z-10 w-5 h-5 rounded-full bg-gray-700
              text-white flex items-center justify-center hover:bg-gray-900
              transition-colors shadow-md"
          >
            <X size={10} strokeWidth={3} />
          </button>

          {/* Main circle — tap to track */}
          <button
            onClick={() => navigate('/track-order')}
            aria-label={`Order status: ${meta.label} — tap to track`}
            title={`#${bubbleOrder.order_id} · ${meta.label}`}
            className="relative w-14 h-14 rounded-full flex items-center justify-center
              shadow-lg transition-all duration-200 hover:scale-110 active:scale-95
              animate-bounce-in overflow-visible"
            style={{
              background: meta.color,
              boxShadow: `0 4px 0 ${meta.color}88, 0 6px 16px rgba(0,0,0,0.28)`,
            }}
          >
            {/* Pulsing ring — only for in-progress statuses */}
            {isPulsing && (
              <span
                className="absolute inset-0 rounded-full animate-ping opacity-25"
                style={{ background: meta.color }}
              />
            )}

            <span className="text-2xl leading-none select-none relative z-10">
              {meta.emoji}
            </span>

            {/* Order ID chip at bottom */}
            <span
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-white
                font-bold leading-none rounded-full px-1.5 py-0.5 whitespace-nowrap"
              style={{
                fontSize: 9,
                background: meta.color,
                border: '1.5px solid white',
                boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
              }}
            >
              #{bubbleOrder.order_id?.slice(-3) ?? '—'}
            </span>
          </button>
        </div>
      )}

      {/* ── Go to top — only when scrolled ── */}
      <button
        onClick={scrollToTop}
        aria-label="Go to top"
        className={`w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center
          hover:bg-primary-500 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-1
          ${scrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}
        style={{ boxShadow: '0 4px 0 #b45309, 0 6px 12px rgba(0,0,0,0.25)' }}
      >
        <ChevronUp size={22} />
      </button>

      {/* ── Call button — ALWAYS visible ── */}
      <a
        href={`tel:${phoneRaw}`}
        aria-label="Call restaurant"
        className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center
          hover:bg-green-600 transition-all hover:-translate-y-0.5 active:translate-y-1 shadow-lg"
        style={{ boxShadow: '0 4px 0 #15803d, 0 6px 12px rgba(0,0,0,0.25)' }}
      >
        <Phone size={20} />
      </a>
    </div>
  )
}
