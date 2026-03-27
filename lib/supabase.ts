import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL (starting with https://). Check your .env.local file. Current value: ' + (supabaseUrl || 'missing')
  )
}

if (!supabaseKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Check your .env.local file.'
  )
}

export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
