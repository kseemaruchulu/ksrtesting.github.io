import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { AlertTriangle } from 'lucide-react'
import { validatePhone } from '../lib/utils'

export default function Login() {
  const { user, signInWithGoogle, profile, updatePhone } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [needsPhone, setNeedsPhone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleError, setGoogleError] = useState(null)

  // Check for OAuth error in URL (Supabase redirects back with ?error=... on failure)
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace('#', '?'))
    const err = params.get('error_description') || new URLSearchParams(window.location.search).get('error_description')
    if (err) setGoogleError(decodeURIComponent(err.replace(/\+/g, ' ')))
  }, [])

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('phone').eq('id', user.id).single().then(({ data }) => {
        if (!data?.phone) setNeedsPhone(true)
        else navigate('/')
      })
    }
  }, [user])

  const handleGoogle = async () => {
    setLoading(true)
    setGoogleError(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setGoogleError(error.message)
      toast.error('Google login failed: ' + error.message)
      setLoading(false)
    }
    // On success, browser redirects — no need to setLoading(false)
  }

  const handlePhoneSubmit = async () => {
    const cleaned = validatePhone(phone)
    if (!cleaned) { toast.error('Enter a valid 10-digit Indian mobile number (e.g. 98765 43210)'); return }
    // Check if phone already used by another account
    const { data: existing } = await supabase.from('profiles').select('id').eq('phone', cleaned).neq('id', user.id).maybeSingle()
    if (existing) { toast.error('This phone number is already linked to another account'); return }
    setLoading(true)
    const { error } = await updatePhone(phone.trim())
    if (!error) { toast.success('Welcome!'); navigate('/') }
    else toast.error('Failed to save phone number')
    setLoading(false)
  }

  if (needsPhone) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center bg-cream-50">
        <div className="card p-8 max-w-md w-full mx-4 animate-slide-up">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📞</div>
            <h2 className="font-display text-2xl font-bold text-gray-900">One more step</h2>
            <p className="text-gray-500 text-sm mt-2">We need your phone number for delivery updates</p>
          </div>
          <input value={phone} onChange={e => setPhone(e.target.value)} className="input mb-4"
            placeholder="+91 98765 43210" type="tel" />
          <p className="text-xs text-gray-400 mb-5 text-center">Only shared with the restaurant for delivery purposes.</p>
          <button onClick={handlePhoneSubmit} disabled={loading} className="btn-primary w-full">
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20 min-h-screen flex items-center justify-center bg-cream-50">
      <div className="card p-8 max-w-md w-full mx-4 animate-slide-up text-center">
        <div className="text-5xl mb-4">🍽</div>
        <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Welcome</h1>
        <p className="text-gray-500 mb-8">Sign in to place orders and track delivery</p>

        {/* Google error message */}
        {googleError && (
          <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 text-left flex gap-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Google sign-in failed</p>
              <p className="text-xs text-red-600 mt-1">{googleError}</p>
              <p className="text-xs text-gray-500 mt-2">
                If this keeps happening, make sure Google is enabled in your Supabase project under
                Authentication → Providers → Google.
              </p>
            </div>
          </div>
        )}

        <button onClick={handleGoogle} disabled={loading}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 py-3.5 px-6 rounded-xl font-medium text-gray-700 transition-all duration-200 disabled:opacity-70">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loading ? 'Redirecting to Google...' : 'Continue with Google'}
        </button>

        <p className="text-xs text-gray-400 mt-6">By signing in, you agree to our terms and privacy policy.</p>
      </div>
    </div>
  )
}
