import { createBrowserClient } from '@supabase/ssr'

// The cookie name is unified to ensure the server-side proxy can always find it
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'https://izzsbidqdupibjnwefqs.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

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
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  },
  global: {
    fetch: (url, options) => {
      // On the browser, redirect all Supabase traffic through our proxy
      if (typeof window !== 'undefined') {
        const urlStr = url.toString()
        if (urlStr.startsWith(supabaseUrl)) {
          const proxyUrl = urlStr.replace(supabaseUrl, window.location.origin + '/supabase-proxy')
          return fetch(proxyUrl, options)
        }
      }
      return fetch(url, options)
    }
  }
})
