import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { TaxonomyService } from '@/services/taxonomy.service'

export async function GET(request: Request) {
  try {
    const tags = await TaxonomyService.getTermsByTaxonomy('post_tag')
    return NextResponse.json(tags)
  } catch (error) {
    return NextResponse.json({ code: 'internal_error', message: 'Error fetching tags' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_create', message: 'Sorry, you are not allowed to create terms.', data: { status: 401 } }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, slug, description } = body

    if (!name) {
      return NextResponse.json({ code: 'rest_missing_callback_param', message: 'Missing parameter(s): name', data: { status: 400 } }, { status: 400 })
    }

    const term = await TaxonomyService.createTerm(name, slug || '', description || '', 'post_tag')
    
    return NextResponse.json(term, { status: 201 })
  } catch (error) {
    return NextResponse.json({ code: 'internal_error', message: 'Error creating tag' }, { status: 500 })
  }
}
