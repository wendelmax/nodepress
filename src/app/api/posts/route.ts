import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PostService } from '@/services/post.service'

export async function GET(request: Request) {
  // Let's allow public reading for the frontend feed, 
  // but if we want admin-only, we check session.
  // For now, let's keep it open for public GET or check session if it's admin.
  // Wait, in standard WP, GET /posts is public. Let's make it public but formatted correctly.
  
  try {
    const { searchParams } = new URL(request.url)
    const per_page = parseInt(searchParams.get('per_page') || '10')
    const status = searchParams.get('status') || 'publish'
    const type = searchParams.get('type') || 'post'

    let posts;
    if (status === 'all') {
      posts = await PostService.getAdminList(type)
    } else {
      posts = await PostService.getLatestPublished(per_page, type)
    }

    return NextResponse.json(posts)
  } catch (error) {
    return NextResponse.json({ code: 'internal_error', message: 'Error fetching posts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_create', message: 'Sorry, you are not allowed to create posts.', data: { status: 401 } }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, content, status, type, thumbnailId, thumbnailUrl, metaData, postDate } = body

    if (!title) {
      return NextResponse.json({ code: 'rest_missing_callback_param', message: 'Missing parameter(s): title', data: { status: 400 } }, { status: 400 })
    }

    let finalStatus = status || 'publish'
    const finalDate = postDate ? new Date(postDate) : new Date()

    // Intercept future posts
    if (finalStatus === 'publish' && finalDate.getTime() > new Date().getTime()) {
      finalStatus = 'future'
    }

    const post = await PostService.create({
      title,
      content: content || '',
      status: finalStatus,
      type: type || 'post',
      postDate: finalDate,
      thumbnailId: thumbnailId || null,
      thumbnailUrl: thumbnailUrl || null,
      metaData: metaData || undefined,
      authorId: parseInt((session.user as any).id)
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    return NextResponse.json({ code: 'internal_error', message: 'Error creating post' }, { status: 500 })
  }
}
