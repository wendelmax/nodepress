import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import { CommentService } from '@/services/comment.service'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const commentId = parseInt(id)
    if (isNaN(commentId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    await CommentService.deleteComment(commentId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
