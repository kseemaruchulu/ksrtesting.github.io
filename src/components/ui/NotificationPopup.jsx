import { X } from 'lucide-react'
import { useNotifications } from '../../context/NotificationContext'

// Global popup renderer — place once in App, shows on ALL pages
export function GlobalNotificationRenderer() {
  const { popups, dismissTop } = useNotifications()
  if (popups.length === 0) return null
  return (
    <>
      <NotificationPopup popup={popups[0]} onClose={dismissTop} />
      {popups.length > 1 && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[101] bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
          +{popups.length - 1} more notification{popups.length > 2 ? 's' : ''}
        </div>
      )}
    </>
  )
}

// Also exported for cases where you want to render a specific popup
export function NotificationPopup({ popup, onClose }) {
  if (!popup) return null

  const isBooking = popup.type === 'booking'
  const headerBg  = isBooking ? 'bg-blue-600'  : 'bg-green-600'
  const bodyBg    = isBooking ? 'bg-blue-50 border-blue-200'  : 'bg-green-50 border-green-200'
  const textColor = isBooking ? 'text-blue-800' : 'text-green-800'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: 'slideUpIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Coloured header with clear title */}
        <div className={`${headerBg} text-white px-5 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{isBooking ? '🪑' : '🍽'}</span>
            <div>
              <p className="font-bold text-lg leading-tight">{popup.title || (isBooking ? 'New Table Booking' : 'New Order')}</p>
              <p className="text-white/70 text-xs">{isBooking ? 'Table reservation' : 'Food order'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Rows */}
        <div className="px-6 pt-5 pb-3 space-y-2.5">
          {(popup.rows || []).filter(([l]) => l !== '').map(([label, value], i) => (
            <div key={i} className="flex justify-between items-start gap-3">
              <span className="text-gray-400 text-sm shrink-0">{label}</span>
              <span className="font-semibold text-gray-900 text-sm text-right">{value}</span>
            </div>
          ))}
          {/* Message rows (empty label) */}
          {(popup.rows || []).filter(([l]) => l === '').map(([, value], i) => (
            <p key={'msg' + i} className="text-gray-500 text-sm text-center pt-1">{value}</p>
          ))}
        </div>

        {/* Summary badge */}
        {popup.summary && (
          <div className={`mx-6 mb-4 mt-1 px-4 py-2.5 rounded-2xl border ${bodyBg}`}>
            <p className={`font-bold text-center ${textColor}`}>{popup.summary}</p>
          </div>
        )}

        <div className="px-6 pb-6">
          <button onClick={onClose} className="btn-primary w-full">OK</button>
        </div>
      </div>
    </div>
  )
}

// Keep for backward compat
export function NotificationQueue({ popups, onDismiss }) {
  if (!popups || popups.length === 0) return null
  return <NotificationPopup popup={popups[0]} onClose={onDismiss} />
}

