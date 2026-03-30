import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { requestPushPermission } from '../lib/pushNotifications'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    // Restore owner session from localStorage
    if (localStorage.getItem('owner_session') === 'true') setIsOwner(true)

    // Get initial session — this also handles the redirect from Google OAuth
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        doFetchProfile(session.user)
        if (localStorage.getItem('owner_session') === 'true') setIsOwner(true)
      }
      setLoading(false)
    })

    // Listen for login / logout / token refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session.user)
        doFetchProfile(session.user)
        if (localStorage.getItem('owner_session') === 'true') setIsOwner(true)
        // Request push notification permission on first login
        if (event === 'SIGNED_IN') {
          setTimeout(() => requestPushPermission(), 2000)
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setIsOwner(false)
        localStorage.removeItem('owner_session')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const doFetchProfile = async (u) => {
    if (!u) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle()

    if (data) {
      setProfile(data)
    } else {
      // First time Google login — create profile row automatically
      const newProfile = {
        id:         u.id,
        email:      u.email,
        name:       u.user_metadata?.full_name || u.email,
        avatar_url: u.user_metadata?.avatar_url || null,
        role:       'user',
      }
      await supabase.from('profiles').insert(newProfile)
      setProfile(newProfile)
    }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setIsOwner(false)
    localStorage.removeItem('owner_session')
  }

  const ownerLogin = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error }
    if (!data.user) return { error: { message: 'Login failed' } }

    await new Promise(r => setTimeout(r, 400))

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError) {
      await supabase.auth.signOut()
      return { error: { message: 'Could not verify role. Check Supabase RLS policies.' } }
    }

    if (!profileData) {
      await supabase.from('profiles').insert({
        id: data.user.id, email: data.user.email,
        name: data.user.user_metadata?.full_name || 'Owner', role: 'user',
      })
      await supabase.auth.signOut()
      return { error: { message: `Profile created. Now run in Supabase SQL Editor: UPDATE profiles SET role = 'owner' WHERE email = '${email}'; — then try again.` } }
    }

    if (profileData.role === 'owner') {
      setIsOwner(true)
      localStorage.setItem('owner_session', 'true')
      return { error: null }
    } else {
      await supabase.auth.signOut()
      return { error: { message: `Not an owner account. Run in Supabase SQL Editor: UPDATE profiles SET role = 'owner' WHERE email = '${email}';` } }
    }
  }

  const ownerLogout = async () => {
    setIsOwner(false)
    localStorage.removeItem('owner_session')
    await supabase.auth.signOut()
  }

  const updatePhone = async (phone) => {
    if (!user) return { error: { message: 'Not logged in' } }
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, phone, email: user.email,
      name: user.user_metadata?.full_name,
      avatar_url: user.user_metadata?.avatar_url,
    })
    if (!error) doFetchProfile(user)
    return { error }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading, isOwner,
      signInWithGoogle, signOut,
      ownerLogin, ownerLogout,
      updatePhone,
      fetchProfile: () => doFetchProfile(user),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
