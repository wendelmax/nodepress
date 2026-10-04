import { NextResponse } from 'next/server'
import { SearchValidationError, searchService } from '@/modules/search'
import { requireAdmin } from '../plugins/_shared'

export async function GET() {
  const result = await requireAdmin()
  if ('response' in result) return result.response
  try {
    return NextResponse.json(await searchService.health())
  } catch {
    return NextResponse.json({ code: 'internal_error', message: 'Error checking search health' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const result = await requireAdmin()
  if ('response' in result) return result.response
  try {
    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new SearchValidationError('Search configuration must be an object')
    }
    return NextResponse.json(await searchService.updateConfiguration(body))
  } catch (error) {
    if (error instanceof SearchValidationError) {
      return NextResponse.json({ code: 'invalid_request', message: error.message }, { status: 400 })
    }
    return NextResponse.json({ code: 'internal_error', message: 'Error updating search configuration' }, { status: 500 })
  }
}
