import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import { TaxonomyService } from '@/services/taxonomy.service'

export async function GET(request: Request) {
  try {
    const categories = await TaxonomyService.getTermsByTaxonomy('category')
    return NextResponse.json(categories)
  } catch (error) {
    return NextResponse.json({ code: 'internal_error', message: 'Error fetching categories' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_create', message: 'Sorry, you are not allowed to create terms.', data: { status: 401 } }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, slug, description } = body

    if (!name) {
      return NextResponse.json({ code: 'rest_missing_callback_param', message: 'Missing parameter(s): name', data: { status: 400 } }, { status: 400 })
    }

    const term = await TaxonomyService.createTerm(name, slug || '', description || '', 'category')
    
    return NextResponse.json(term, { status: 201 })
  } catch (error) {
    return NextResponse.json({ code: 'internal_error', message: 'Error creating category' }, { status: 500 })
  }
}
