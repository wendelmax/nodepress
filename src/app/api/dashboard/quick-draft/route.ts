import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import prisma from '@/lib/prisma'

/**
 * POST /api/dashboard/quick-draft
 *
 * Creates a new draft post from the dashboard Quick Draft widget.
 * Returns the new post ID so the client can redirect to the editor.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  try {
    const { title, content } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: 'O título é obrigatório.' }, { status: 400 })
    }

    // Resolve the author's DB ID from the session email
    const author = await prisma.user.findFirst({
      where: { userEmail: session.user.email! },
      select: { id: true },
    })

    if (!author) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 })
    }

    const slug = title
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 80)

    const post = await prisma.post.create({
      data: {
        postTitle: title.trim(),
        postContent: content?.trim() || '',
        postStatus: 'draft',
        postName: `${slug}-${Date.now()}`,
        postAuthor: author.id,
        postType: 'post',
        postMimeType: '',
        guid: '',
        postExcerpt: '',
        postPassword: '',
        toPing: '',
        pinged: '',
        postContentFiltered: '',
      },
    })

    return NextResponse.json({ id: post.id }, { status: 201 })
  } catch (error: any) {
    console.error('[quick-draft] Error:', error)
    return NextResponse.json({ error: 'Erro interno ao criar o rascunho.' }, { status: 500 })
  }
}
