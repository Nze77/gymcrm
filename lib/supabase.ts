import { createBrowserClient } from '@supabase/ssr'

const isBrowser = typeof window !== 'undefined'
const supabaseUrl = isBrowser 
  ? window.location.origin + '/supabase-proxy' // Use full URL for the local proxy in browser
  : process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()

const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || (!isBrowser && !supabaseUrl.startsWith('https://'))) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL must be a valid URL. Check your .env.local file.'
  )
}

if (!supabaseKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Check your .env.local file.'
  )
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
