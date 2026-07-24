import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServiceToken, admissionsBaseUrl, tenantId } from '@/lib/admissions-service-token'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { formId, ...data } = body

    if (!formId) {
      return NextResponse.json({ error: 'formId is required' }, { status: 400 })
    }

    // Verify if form exists
    const form = await prisma.post.findUnique({
      where: { id: parseInt(formId, 10) },
      include: { meta: true }
    })

    if (!form || form.postType !== 'form') {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    const isAdmissionForm = form.meta.some(m => m.metaKey === '_np_form_kind' && m.metaValue === 'admission')

    if (isAdmissionForm) {
      const { name, email, phone } = data as Record<string, string>
      if (!name || !email || !phone) {
        return NextResponse.json(
          { error: 'Este formulário requer os campos "name", "email" e "phone".' },
          { status: 400 }
        )
      }
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

    if (isAdmissionForm) {
      const processId = form.meta.find(m => m.metaKey === '_np_admission_process_id')?.metaValue || ''
      const modality = form.meta.find(m => m.metaKey === '_np_admission_modality')?.metaValue || ''

      if (!processId || !modality) {
        return NextResponse.json(
          { error: 'Formulário de admissão mal configurado (falta processo seletivo ou modalidade).' },
          { status: 500 }
        )
      }

      try {
        const token = await getServiceToken()
        const leadRes = await fetch(`${admissionsBaseUrl()}/api/admissions/applications/dynamic`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Tenant-ID': tenantId(),
          },
          body: JSON.stringify({
            process_id: processId,
            name: data.name,
            email: data.email,
            phone: data.phone,
            modality,
            payload: JSON.stringify(payloadData),
            utm_source: (data.utm_source as string) || 'nodepress',
            utm_medium: (data.utm_medium as string) || 'form',
            utm_campaign: (data.utm_campaign as string) || form.postTitle,
            referred_by: '00000000-0000-0000-0000-000000000000',
          }),
        })

        if (!leadRes.ok) {
          const text = await leadRes.text()
          console.error('Failed to create admissions lead:', leadRes.status, text)
          return NextResponse.json(
            { error: 'Não foi possível registrar sua candidatura no momento. Tente novamente.' },
            { status: 502 }
          )
        }
      } catch (err: any) {
        console.error('Failed to reach admissions service:', err)
        return NextResponse.json(
          { error: 'Não foi possível registrar sua candidatura no momento. Tente novamente.' },
          { status: 502 }
        )
      }
    }

    return NextResponse.json({ success: true, submissionId: submission.id })
  } catch (error: any) {
    console.error("Form submission error:", error)
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 })
  }
}
