import { NextResponse } from 'next/server'
import { AnalyticsService } from '@/services/analytics.service'

/**
 * POST /api/analytics/track
 *
 * Called by Next.js Middleware on every public page request.
 * Body: { isNewVisitor: boolean }
 *
 * - Always increments view count
 * - Increments visitor count only when isNewVisitor === true
 *   (i.e., the request had no session cookie, so Middleware set one)
 *
 * This is the only place where analytics writes happen —
 * no randomization, no mock data.
 */
export async function POST(request: Request) {
  try {
    const { isNewVisitor } = await request.json()
    await AnalyticsService.recordPageView({ isNewVisitor: Boolean(isNewVisitor) })
    return NextResponse.json({ ok: true })
  } catch {
    // Silently absorb errors — analytics must never break the app
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
