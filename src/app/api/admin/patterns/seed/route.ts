import { patternService } from '@/services/pattern.service'
import { NextResponse } from 'next/server'
import { requirePatternAdmin } from '../_shared'

export async function POST() {
  const access = await requirePatternAdmin()
  if ('response' in access) return access.response
  const created = await patternService.seedDefaults()
  return NextResponse.json({ created })
}
