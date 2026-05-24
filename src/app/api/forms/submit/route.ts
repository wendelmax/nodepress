import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { formId, ...data } = body

    if (!formId) {
      return NextResponse.json({ error: 'formId is required' }, { status: 400 })
    }

    // Verify if form exists
    const form = await prisma.post.findUnique({
      where: { id: parseInt(formId, 10) }
    })

    if (!form || form.postType !== 'form') {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Capture basic request info
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown IP'
    const userAgent = request.headers.get('user-agent') || 'Unknown Browser'

    // Create submission as a child post of the form
    const submission = await prisma.post.create({
      data: {
        postTitle: `Submissão - Form ${formId} - ${new Date().toISOString()}`,
        postContent: JSON.stringify(data),
        postStatus: 'publish', // Or 'unread' if we expand statuses
        postName: `submission-${Date.now()}`,
        postAuthor: 1, // System or Admin ID
        postType: 'form_submission',
        postParent: form.id,
        postMimeType: '',
        guid: '',
        postExcerpt: ip, // Save IP in excerpt
        postPassword: '',
        toPing: '',
        pinged: '',
        postContentFiltered: userAgent // Save UserAgent in filtered content
      }
    })

    return NextResponse.json({ success: true, submissionId: submission.id })
  } catch (error: any) {
    console.error("Form submission error:", error)
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
  }
}
