import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { formService } from '@/modules/forms'
import { ensureLegacyFormDefinition } from '@/modules/forms/legacy-form-adapter'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params

  try {
    if (/^\d+$/.test(id)) {
      const post = await prisma.post.findUnique({
        where: { id: Number(id) },
        select: { id: true, postType: true, postName: true, postTitle: true, postContent: true },
      })
      if (!post || post.postType !== 'form') return notFound()
      return NextResponse.json(await ensureLegacyFormDefinition(post))
    }

    return NextResponse.json(await formService.getDefinition(id))
  } catch (error) {
    if (error instanceof Error && (error.name === 'FormNotFoundError' || error.name === 'LegacyFormMappingError')) return notFound()
    return NextResponse.json({ code: 'internal_error', message: 'Error loading form' }, { status: 500 })
  }
}

function notFound(): NextResponse {
  return NextResponse.json({ code: 'not_found', message: 'Form not found' }, { status: 404 })
}
