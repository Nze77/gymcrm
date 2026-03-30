import { createBrowserClient } from '@supabase/ssr'

// The cookie name is unified to ensure the server-side proxy can always find it
const isBrowser = typeof window !== 'undefined'
const supabaseUrl = isBrowser
  ? window.location.origin + '/supabase-proxy'
  : process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()


const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL is missing. Check your .env file.'
  )
}

if (!supabaseKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Check your .env file.'
  )
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
  cookieOptions: {
    name: 'sb-gym-crm-auth',
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
})
