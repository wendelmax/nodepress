import { NextResponse } from 'next/server'
import {
  getPublishedPostShowcase,
  normalizePostShowcaseQuery,
} from '@/services/post-showcase.service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const postType = searchParams.get('type')
  const rawLimit = searchParams.get('limit')
  const category = searchParams.get('category') ?? undefined

  if (!postType || (rawLimit !== null && (rawLimit.trim() === '' || Number.isNaN(Number(rawLimit))))) {
    return NextResponse.json(
      { code: 'invalid_request', message: 'Invalid showcase query' },
      { status: 400 },
    )
  }

  try {
    const query = normalizePostShowcaseQuery({
      postType,
      limit: rawLimit === null ? 6 : Number(rawLimit),
      category,
    })
    const items = await getPublishedPostShowcase(query)
    return NextResponse.json(items)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Invalid post type')) {
      return NextResponse.json(
        { code: 'invalid_request', message: error.message },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { code: 'internal_error', message: 'Error fetching post showcase' },
      { status: 500 },
    )
  }
}
