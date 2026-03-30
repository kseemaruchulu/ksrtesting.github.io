import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { useRestaurant } from '../context/RestaurantContext'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function About() {
  const { settings } = useRestaurant()
  const { ownerLogin, isOwner } = useAuth()
  const navigate = useNavigate()

  const [clicks, setClicks] = useState(0)
  const [showOwnerLogin, setShowOwnerLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleTitleClick = () => {
    const next = clicks + 1
    setClicks(next)
    if (next >= 5) { setShowOwnerLogin(true); setClicks(0) }
  }

  const handleOwnerLogin = async () => {
    if (!email || !password) { toast.error('Enter credentials'); return }
    setLoading(true)
    const { error } = await ownerLogin(email, password)
    if (!error) { toast.success('Welcome, Owner!'); setShowOwnerLogin(false); navigate('/owner') }
    else toast.error(error.message || 'Login failed')
    setLoading(false)
  }

  // ── GOOGLE MAPS GUIDE ──────────────────────────────────────────────
  // To set the map, go to Owner Dashboard → Settings → "Google Maps Embed URL"
  // Steps:
  //   1. Open https://maps.google.com
  //   2. Search your restaurant address
  //   3. Click Share (the share icon) → "Embed a map" tab
  //   4. Click "COPY HTML" — you get something like:
  //      <iframe src="https://www.google.com/maps/embed?pb=!1m18!..." ...></iframe>
  //   5. From that, copy ONLY the URL between src=" and the closing "
  //      It must start with: https://www.google.com/maps/embed?pb=
  //   6. Paste just that URL into Owner Dashboard → Settings → Google Maps Embed URL → Save
  // ────────────────────────────────────────────────────────────────────
  const rawEmbed = settings.google_maps_embed_url || ''
  // Handle both: full iframe paste OR just the URL
  const embedUrl = (() => {
    const s = rawEmbed.trim()
    if (!s) return ''
    // If they pasted the full iframe tag, extract the src URL
    const match = s.match(/src=["']([^"']+)["']/)
    if (match) return match[1]
    // If they pasted just the URL directly
    if (s.startsWith('http')) return s
    return ''
  })()

  return (
    <div className="pt-20 min-h-screen bg-cream-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-16">
          <div>
            <h1 className="section-title mb-4 cursor-default select-none" onClick={handleTitleClick}>
              About {settings.name}
            </h1>
            <p className="text-gray-600 leading-relaxed text-lg mb-6">{settings.about}</p>
            <div className="grid grid-cols-2 gap-4">
              {[
                [settings.stat_customers || '500+', 'Happy Customers'],
                [settings.stat_items || '50+', 'Menu Items'],
                [settings.stat_rating || '4.8★', 'Avg Rating'],
                [settings.stat_delivery || '30min', 'Avg Delivery'],
              ].map(([val, label]) => (
                <div key={label} className="bg-white rounded-2xl p-4 text-center shadow-sm">
                  <div className="font-display text-2xl font-bold text-primary-600">{val}</div>
                  <div className="text-sm text-gray-500 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm">
            <h2 className="font-display text-2xl font-semibold mb-5 flex items-center gap-2">
              <MapPin size={22} className="text-primary-600" /> Find Us
            </h2>
            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3 text-gray-600"><MapPin size={18} className="text-primary-500 mt-0.5 shrink-0" /><span>{settings.address}</span></li>
              <li className="flex items-center gap-3 text-gray-600"><Phone size={18} className="text-primary-500 shrink-0" /><a href={`tel:${settings.phone}`} className="hover:text-primary-600 transition-colors">{settings.phone}</a></li>
              <li className="flex items-center gap-3 text-gray-600"><Mail size={18} className="text-primary-500 shrink-0" /><a href={`mailto:${settings.email}`} className="hover:text-primary-600 transition-colors">{settings.email}</a></li>
              <li className="flex items-start gap-3 text-gray-600"><Clock size={18} className="text-primary-500 mt-0.5 shrink-0" /><span>{settings.opening_hours}</span></li>
            </ul>

            {/* Google Maps Embed */}
            {embedUrl ? (
              <div className="rounded-2xl overflow-hidden border border-gray-100 mt-4">
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="250"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Restaurant Location"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            ) : (
              <div className="rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                <MapPin size={24} className="mx-auto mb-2 opacity-30" />
                <p className="font-medium">Map not configured yet</p>
                <p className="text-xs mt-2 text-gray-400">
                  To add: Google Maps → Share → Embed a map → copy the URL from inside src="..." → paste in Owner Dashboard → Settings → Google Maps Embed URL
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Developer */}
        <div className="card p-6 text-center">
          <p className="text-gray-500 text-sm">Website developed by</p>
          <h3 className="font-display text-xl font-semibold text-gray-900 mt-1">Your Developer Name</h3>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm">
            <a href="mailto:developer@example.com" className="text-primary-600 hover:underline flex items-center gap-1"><Mail size={13} /> developer@example.com</a>
            <a href="tel:+910000000000" className="text-primary-600 hover:underline flex items-center gap-1"><Phone size={13} /> +91 00000 00000</a>
          </div>
        </div>

        {/* Hidden owner login */}
        {showOwnerLogin && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowOwnerLogin(false)}>
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full animate-slide-up" onClick={e => e.stopPropagation()}>
              <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">Owner Access</h2>
              <p className="text-gray-400 text-sm mb-6">Restricted area</p>
              <div className="space-y-3">
                <input value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="Email" type="email" />
                <input value={password} onChange={e => setPassword(e.target.value)} className="input" placeholder="Password" type="password" onKeyDown={e => e.key === 'Enter' && handleOwnerLogin()} />
              </div>
              <button onClick={handleOwnerLogin} disabled={loading} className="btn-primary w-full mt-5">
                {loading ? 'Verifying...' : 'Login as Owner'}
              </button>
              {isOwner && (
                <button onClick={() => { setShowOwnerLogin(false); navigate('/owner') }} className="btn-secondary w-full mt-3 text-sm">Go to Dashboard</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
