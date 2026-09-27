import { auth } from '@/auth'
import { NextResponse } from 'next/server'

type PatternAdminAccess = { response: Response } | { ok: true }

export async function requirePatternAdmin(): Promise<PatternAdminAccess> {
  const session = await auth()
  const role = session?.user ? (session.user as { role?: string }).role : undefined
  if (role !== 'admin') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) as Response }
  }
  return { ok: true as const }
}
