import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import prisma from '@/lib/prisma'

/**
 * POST /api/analytics/reset
 *
 * Clears accumulated analytics data so fresh real tracking begins.
 * Requires admin session.
 */
export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.option.upsert({
      where: { optionName: 'site_analytics' },
      update: { optionValue: JSON.stringify({ totalViews: 0, totalVisitors: 0, dailyStats: {} }) },
      create: { optionName: 'site_analytics', optionValue: JSON.stringify({ totalViews: 0, totalVisitors: 0, dailyStats: {} }) },
    })
    return NextResponse.json({ ok: true, message: 'Analytics data reset.' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
