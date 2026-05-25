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

    // Create submission in the FormSubmission table
    const payloadData = {
      ...data,
      _metadata: {
        ip,
        userAgent
      }
    }

    const submission = await prisma.formSubmission.create({
      data: {
        formId: formId.toString(),
        payload: JSON.stringify(payloadData),
        status: 'unread'
      }
    })

    return NextResponse.json({ success: true, submissionId: submission.id })
  } catch (error: any) {
    console.error("Form submission error:", error)
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
  }
}
