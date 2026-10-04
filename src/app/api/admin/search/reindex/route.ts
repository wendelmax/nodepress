import { NextResponse } from 'next/server'
import { SearchValidationError, searchService } from '@/modules/search'
import { requireAdmin } from '../../plugins/_shared'

export async function POST(request: Request) {
  const result = await requireAdmin()
  if ('response' in result) return result.response
  try {
    const body = await request.json().catch(() => ({}))
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new SearchValidationError('Reindex payload must be an object')
    }
    if (body.tenantId !== undefined && (typeof body.tenantId !== 'string' || body.tenantId.trim() === '')) {
      throw new SearchValidationError('Invalid tenant id')
    }
    return NextResponse.json(await searchService.reindex({ tenantId: body.tenantId?.trim() || undefined }))
  } catch (error) {
    if (error instanceof SearchValidationError) {
      return NextResponse.json({ code: 'invalid_request', message: error.message }, { status: 400 })
    }
    return NextResponse.json({ code: 'internal_error', message: 'Error reindexing search' }, { status: 500 })
  }
}
