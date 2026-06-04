import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const SESSION_COOKIE = 'np_sid'
const SESSION_TTL_SECONDS = 30 * 60

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- RBAC for Admin Routes ---
  if (pathname.startsWith('/admin')) {
    const token = await getToken({ req: request })
    
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const role = token.role as string || 'author'

    // Block non-admins from settings, users, plugins, themes
    if (role !== 'admin') {
      const blockedPrefixes = ['/admin/settings', '/admin/users', '/admin/plugins', '/admin/themes', '/admin/tools']
      if (blockedPrefixes.some(prefix => pathname.startsWith(prefix))) {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }
    
    // Allow access to other admin routes
    return NextResponse.next()
  }

  // --- Analytics for Public Routes ---
  const response = NextResponse.next()
  const isPageMethod = request.method === 'GET' || request.method === 'HEAD'
  const isPrefetch = request.headers.get('purpose') === 'prefetch' || request.headers.get('next-router-prefetch') === '1'
  const skipAnalyticsPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/setup-config') ||
    pathname.startsWith('/install')

  if (!isPageMethod || isPrefetch || skipAnalyticsPath) {
    return response
  }

  const existingSession = request.cookies.get(SESSION_COOKIE)
  const isNewVisitor = !existingSession
  const sessionId = existingSession?.value || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  
  if (isNewVisitor) {
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    })
  }

  const host = request.nextUrl.origin
  fetch(`${host}/api/analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      isNewVisitor,
      path: pathname,
      sessionId
    }),
  }).catch(() => { /* silently swallow network errors */ })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - /api   (and sub-routes)
     *  - /_next (Next.js internals)
     *  - /favicon.ico, static files with extensions
     */
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|otf|map)).*)',
  ],
}
