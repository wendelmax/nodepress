import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { CommentService } from '@/services/comment.service'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const commentId = parseInt(id)
    if (isNaN(commentId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const body = await request.json()
    const { status } = body // '1', '0', 'spam', 'trash'

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    const comment = await CommentService.updateStatus(commentId, status)
    return NextResponse.json(comment)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}
