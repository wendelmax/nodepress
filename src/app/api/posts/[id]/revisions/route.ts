import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import { PostService } from '@/services/post.service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: paramId } = await params
  const id = parseInt(paramId)

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  const revisions = await PostService.getRevisions(id)
  return NextResponse.json(revisions)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: paramId } = await params
  const id = parseInt(paramId)

  if (isNaN(id)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { revisionId } = body

    if (!revisionId || isNaN(parseInt(revisionId))) {
      return NextResponse.json({ error: 'Invalid revisionId' }, { status: 400 })
    }

    const restoredPost = await PostService.restoreRevision(parseInt(revisionId))
    return NextResponse.json(restoredPost)
  } catch (error: any) {
    console.error('Error restoring revision:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
