import { useRestaurant } from '../../context/RestaurantContext'
import { useLocation } from 'react-router-dom'

// Pages where the bar is hidden
const HIDDEN_PATHS = ['/about', '/profile', '/track-order']

export default function AnnouncementBar() {
  const { settings } = useRestaurant()
  const { pathname } = useLocation()

  // Hide on excluded pages, when restaurant is closed, or when owner turned it off
  if (!settings.is_open) return null
  if (!settings.announcement_enabled) return null
  if (!settings.announcement_text?.trim()) return null
  if (HIDDEN_PATHS.includes(pathname)) return null

  return (
    <div className="bg-primary-600 text-white overflow-hidden py-2 fixed bottom-0 left-0 right-0 z-50">
      <div className="flex items-center">
        {/* Marquee wrapper — duplicate text for seamless loop */}
        <div
          className="flex whitespace-nowrap"
          style={{ animation: 'marquee 28s linear infinite' }}
        >
          {/* Repeat text 4 times for seamless loop */}
          {[0,1,2,3,4,5,6].map(i => (
            <span key={i} className="flex items-center px-8 text-sm font-medium">
              🔥 {settings.announcement_text}
              <span className="mx-6 opacity-50">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
