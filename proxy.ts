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

  const gymName = process.env.NEXT_PUBLIC_GYM_NAME || 'Gym CRM'

  try {
    // 4. Decode session from cookie locally (no network call needed)
    function getSessionUser(cookieHeader: string | null): { email: string } | null {
      if (!cookieHeader) return null
      try {
        const cookies = Object.fromEntries(
          cookieHeader.split(';').map(c => {
            const [k, ...v] = c.trim().split('=')
            return [k.trim(), decodeURIComponent(v.join('='))]
          })
        )
        const sessionCookie = cookies['sb-gym-crm-auth'] ||
          Object.entries(cookies).find(([k]) => k.startsWith('sb-') && k.endsWith('-auth-token'))?.[1]
        if (!sessionCookie) return null

        let rawJson = sessionCookie
        if (rawJson.startsWith('base64-')) {
          rawJson = Buffer.from(rawJson.slice(7), 'base64').toString('utf8')
        }
        const parsed = JSON.parse(rawJson)
        const accessToken = parsed?.access_token || parsed?.[0]?.access_token || parsed
        if (!accessToken || typeof accessToken !== 'string') return null

        const parts = accessToken.split('.')
        if (parts.length !== 3) return null

        const payload = JSON.parse(
          Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
        )

        if (!payload.exp || payload.exp * 1000 < Date.now()) return null

        return { email: payload.email || '' }
      } catch {
        return null
      }
    }

    const user = getSessionUser(request.headers.get('cookie'))
    console.log(`[Proxy] ${gymName} | ${request.method} ${pathname} | User:`, user?.email ?? 'none')

    // 6. Role-Based Access Control (RBAC) checks
    const userEmail = user?.email?.toLowerCase() || ''
    const isCheckinUser = userEmail === 'checkin@gym.com' || userEmail.startsWith('checkin@')
    const isAdminUser = userEmail === 'admin@gym.com' || userEmail.startsWith('admin@')
    const isLoginPage = pathname.startsWith('/login')
    const isCheckinPath = pathname.startsWith('/checkin')

    // Redirect unauthenticated users to login
    if (!user && !isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      const redirectResp = NextResponse.redirect(url)
      response.headers.forEach((v, k) => redirectResp.headers.set(k, v))
      return redirectResp
    }

    // Redirect authenticated users away from login
    if (user && isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = isAdminUser ? '/dashboard' : '/checkin'
      const redirectResp = NextResponse.redirect(url)
      response.headers.forEach((v, k) => redirectResp.headers.set(k, v))
      return redirectResp
    }

    // Redirect admin user from root (/) to /dashboard on desktop
    if (user && isAdminUser && pathname === '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      const redirectResp = NextResponse.redirect(url)
      response.headers.forEach((v, k) => redirectResp.headers.set(k, v))
      return redirectResp
    }

    // STRICT CHECKIN PROTECTION: 
    // If user is 'checkin@gym.com', they can ONLY access /checkin (and its API/Supabase resources).
    // They are blocked from accessing /, /members, /attendance, /messages, etc.
    if (isCheckinUser && !isCheckinPath) {
      console.log(`[Proxy] Role Violation: Blocked ${userEmail} from ${pathname}`)
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
