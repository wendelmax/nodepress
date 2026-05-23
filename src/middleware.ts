import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'np_sid'
// 30 minutes in seconds — a visitor who comes back after this gets counted again
const SESSION_TTL_SECONDS = 30 * 60

/**
 * NodePress Analytics Middleware
 *
 * Runs on every public page request (not API routes, admin, or static assets).
 *
 * Logic:
 *  - No `np_sid` cookie  → new visitor session. Set cookie + record as new visitor.
 *  - `np_sid` present    → returning visitor in the same session. Record view only.
 *
 * Analytics writes happen asynchronously via POST /api/analytics/track
 * so they don't block page rendering (fire-and-forget with waitUntil).
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const existingSession = request.cookies.get(SESSION_COOKIE)
  const isNewVisitor = !existingSession

  if (isNewVisitor) {
    // Set a session cookie — value is a lightweight timestamp-based ID (no PII)
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    response.cookies.set(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    })
  }

  // Fire-and-forget: record the event without blocking the response.
  // We call our own API route to keep all DB logic server-side.
  const host = request.nextUrl.origin
  fetch(`${host}/api/analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isNewVisitor }),
  }).catch(() => { /* silently swallow network errors */ })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - /admin (and sub-routes)
     *  - /api   (and sub-routes)
     *  - /_next (Next.js internals)
     *  - /favicon.ico, static files with extensions
     */
    '/((?!admin|api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|otf|map)).*)',
  ],
}
