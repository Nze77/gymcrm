import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Allow supabase proxy rewrite requests to pass through without auth check
  if (request.nextUrl.pathname.startsWith('/supabase-proxy')) {
    return NextResponse.next()
  }

  // Create a single response object — do NOT recreate it in cookie callbacks
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('Supabase environment variables are missing in proxy!')
    return response
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // This refreshes the session if expired and sets updated cookies on 'response'
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.log('[Proxy] Auth check log (non-fatal):', error.message)
    }

    const gymName = process.env.NEXT_PUBLIC_GYM_NAME || 'Gym CRM'
    console.log(`[Proxy] ${gymName} | ${request.nextUrl.pathname} | user:`, user?.email ?? 'none')

    // If not logged in and not on /login, redirect to login
    if (!user && !request.nextUrl.pathname.startsWith('/login')) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url, { headers: response.headers })
    }

    // If logged in and on /login, redirect to checkin
    if (user && request.nextUrl.pathname.startsWith('/login')) {
      const url = request.nextUrl.clone();
      url.pathname = '/checkin';
      return NextResponse.redirect(url, { headers: response.headers })
    }
  } catch (err) {
    console.error('[Proxy] CRITICAL ERROR:', err)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|supabase-proxy|_next/static|_next/image|favicon.ico).*)'],
}
