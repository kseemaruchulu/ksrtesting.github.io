import { useState, useEffect } from 'react'
import { Phone, ChevronUp } from 'lucide-react'
import { useRestaurant } from '../../context/RestaurantContext'

export default function FloatingButtons() {
  const { settings } = useRestaurant()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })
  const phoneRaw = (settings.phone || '').replace(/\s+/g, '')

  return (
    <div className="fixed bottom-6 right-5 z-50 flex flex-col gap-3">
      {/* Go to top — only when scrolled */}
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

      {/* Call button — ALWAYS visible */}
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
