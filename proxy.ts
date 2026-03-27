import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Skip proxy routes
  if (pathname.startsWith('/supabase-proxy') || pathname.includes('_next/') || pathname.includes('favicon.ico')) {
    return NextResponse.next()
  }

  // 2. Prepare the base response
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // 3. Environmental sanity check
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  const gymName = process.env.NEXT_PUBLIC_GYM_NAME || 'Gym CRM'

  if (!supabaseUrl || !supabaseKey) {
    console.error(`[Proxy] ${gymName} | Environment variables missing! Check .env file.`)
    return response
  }

  try {
    // 4. Create server-side Supabase client with unified cookie handling
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookieOptions: {
          name: 'sb-gym-crm-auth',
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production'
        },
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

    // 5. Check auth state (safely)
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error && !error.message.includes('Auth session missing')) {
      console.log(`[Proxy] ${gymName} | Auth check log:`, error.message)
    }

    console.log(`[Proxy] ${gymName} | ${request.method} ${pathname} | User:`, user?.email ?? 'none')

    // 6. Handle route protection and redirects
    const isLoginPage = pathname.startsWith('/login')
    
    // Redirect unauthenticated users to login, except if they're already on it or it's a static/API resource
    if (!user && !isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      // Carry cookies/headers from current response (token updates, etc.)
      const redirectResp = NextResponse.redirect(url)
      response.headers.forEach((v, k) => redirectResp.headers.set(k, v))
      return redirectResp
    }

    // Redirect authenticated users away from login to check-in
    if (user && isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/checkin'
      const redirectResp = NextResponse.redirect(url)
      response.headers.forEach((v, k) => redirectResp.headers.set(k, v))
      return redirectResp
    }

  } catch (err) {
    console.error(`[Proxy] ${gymName} | CRITICAL ERROR in proxy:`, err)
  }

  return response
}

export const config = {
  matcher: ['/((?!api|supabase-proxy|_next/static|_next/image|favicon.ico).*)'],
}
