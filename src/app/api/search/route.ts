import { NextResponse } from 'next/server'
import { SearchUnavailableError, SearchValidationError, searchService } from '@/modules/search'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? searchParams.get('search')
  if (!query?.trim() || query.length > 200) {
    return NextResponse.json({ code: 'invalid_request', message: 'Search query is required and must be at most 200 characters' }, { status: 400 })
  }
  const rawPageSize = searchParams.get('pageSize') ?? searchParams.get('limit')
  if (rawPageSize !== null && (!/^\d+$/.test(rawPageSize) || Number(rawPageSize) < 1 || Number(rawPageSize) > 100)) {
    return NextResponse.json({ code: 'invalid_request', message: 'Invalid page size' }, { status: 400 })
  }
  const status = searchParams.get('status')
  if (status && status !== 'publish' && status !== 'published') {
    return NextResponse.json({ code: 'invalid_request', message: 'Public search only supports published content' }, { status: 400 })
  }

  try {
    const result = await searchService.search({
      query,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? searchParams.get('limit') ?? undefined,
      sort: searchParams.get('sort') ?? undefined,
      types: listParam(searchParams, 'type', 'types'),
      statuses: ['publish'],
      authorId: searchParams.get('authorId') ?? searchParams.get('author') ?? undefined,
      categories: listParam(searchParams, 'category', 'categories'),
      tags: listParam(searchParams, 'tag', 'tags'),
      highlight: searchParams.get('highlight') ?? undefined,
    }, { tenantId: process.env.NODEPRESS_TENANT_ID ?? process.env.TENANT_ID })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof SearchValidationError) {
      return NextResponse.json({ code: 'invalid_request', message: error instanceof Error ? error.message : 'Invalid search query' }, { status: 400 })
    }
    if (error instanceof SearchUnavailableError) {
      return NextResponse.json({ code: 'search_unavailable', message: 'Search is currently unavailable' }, { status: 503 })
    }
    return NextResponse.json({ code: 'internal_error', message: 'Error executing search' }, { status: 500 })
  }
}

function listParam(params: URLSearchParams, singular: string, plural: string): string[] {
  return [params.get(singular), params.get(plural)]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
}
