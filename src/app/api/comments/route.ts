import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import { CommentService } from '@/services/comment.service'

export async function GET(request: Request) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const perPage = parseInt(searchParams.get('per_page') || '50', 10)

    const result = await CommentService.getAllComments(page, perPage)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // This route is public for anyone to submit comments.
    const session = await auth()
    
    // Some basic IP extraction logic (Next.js specific depending on proxy/hosting)
    const ip = request.headers.get('x-forwarded-for') || ''

    const body = await request.json()
    const { postId, authorName, authorEmail, content } = body

    if (!postId || !authorName || !authorEmail || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const userId = session?.user ? parseInt((session.user as any).id || '0') : 0

    const comment = await CommentService.addComment({
      postId: parseInt(postId),
      authorName,
      authorEmail,
      content,
      ip,
      userId: userId > 0 ? userId : undefined
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit comment' }, { status: 500 })
  }
}
