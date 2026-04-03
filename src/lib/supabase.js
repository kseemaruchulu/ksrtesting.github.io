import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // PKCE flow works correctly with BrowserRouter + Vite dev server
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
    // Force WebSocket transport — fixes Realtime on Vercel (Vercel's
    // edge network can drop long-poll / SSE connections, causing
    // subscriptions to silently fail in production)
    transport: WebSocket,
  },
})
