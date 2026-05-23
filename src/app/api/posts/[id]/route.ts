import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PostService } from '@/services/post.service'
import { TaxonomyService } from '@/services/taxonomy.service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paramId } = await params
  const id = parseInt(paramId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const post = await PostService.getById(id)

  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(post)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paramId } = await params
  return handleUpdate(request, paramId)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paramId } = await params
  return handleUpdate(request, paramId)
}

async function handleUpdate(request: Request, idStr: string) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_edit', message: 'Sorry, you are not allowed to edit this post.', data: { status: 401 } }, { status: 401 })
  }

  const id = parseInt(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const body = await request.json()
    const { title, content, status, type, thumbnailId, thumbnailUrl, categories, tags, metaData, postDate } = body

    let finalStatus = status
    let finalDate: Date | undefined = undefined

    if (postDate) {
      finalDate = new Date(postDate)
      if (finalStatus === 'publish' && finalDate.getTime() > new Date().getTime()) {
        finalStatus = 'future'
      }
    }

    const post = await PostService.update(id, { 
      title, 
      content, 
      status: finalStatus, 
      type, 
      thumbnailId, 
      thumbnailUrl, 
      metaData, 
      postDate: finalDate 
    })

    // Process Categories & Tags if they are provided
    if (categories !== undefined || tags !== undefined) {
      const termsToConnect = [...(categories || []), ...(tags || [])]
      await TaxonomyService.syncPostTerms(id, termsToConnect)
    }

    return NextResponse.json(post)
  } catch (error) {
    return NextResponse.json({ code: 'rest_invalid_param', message: 'Invalid parameter(s)', data: { status: 400 } }, { status: 400 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_delete', message: 'Sorry, you are not allowed to delete this post.', data: { status: 401 } }, { status: 401 })
  }

  const { id: paramId } = await params
  const id = parseInt(paramId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'

  try {
    const result = await PostService.delete(id, force)
    return NextResponse.json(result)
  } catch (error: any) {
    if (error.message === 'Not found') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ code: 'rest_cannot_delete', message: 'Failed to delete post.', data: { status: 500 } }, { status: 500 })
  }
}
