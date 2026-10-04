import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getFormSubmissionOrchestrator } from '@/modules/forms'
import { ensureLegacyFormDefinition, LegacyFormMappingError } from '@/modules/forms/legacy-form-adapter'

export async function POST(request: Request) {
  const headers = deprecationHeaders()
  try {
    const body = await request.json()
    if (!isRecord(body)) return json({ error: 'Invalid JSON body' }, 400, headers)

    const rawFormId = body.formId
    if (rawFormId === undefined || rawFormId === null || String(rawFormId).trim() === '') {
      return json({ error: 'formId is required' }, 400, headers)
    }
    const formId = Number(rawFormId)
    if (!Number.isInteger(formId) || formId < 1) return json({ error: 'formId must be a positive integer' }, 400, headers)

    const post = await prisma.post.findUnique({
      where: { id: formId },
      select: { id: true, postType: true, postName: true, postTitle: true, postContent: true },
    })
    if (!post || post.postType !== 'form') return json({ error: 'Form not found' }, 404, headers)

    const canonicalForm = await ensureLegacyFormDefinition(post)
    const responseHeaders = deprecationHeaders(canonicalForm.id)
    console.info('[forms.deprecated]', { legacyFormId: formId, canonicalFormId: canonicalForm.id })
    const security = isRecord(body.security) ? body.security : isRecord(body._security) ? body._security : {}
    const values = { ...body }
    delete values.formId
    delete values.security
    delete values._security
    delete values.idempotencyKey
    delete values.uploads

    const orchestrator = await getFormSubmissionOrchestrator()
    const idempotencyKey = typeof body.idempotencyKey === 'string'
      ? body.idempotencyKey
      : request.headers.get('idempotency-key') || undefined
    const result = await orchestrator.submit({
      formId: canonicalForm.id,
      values,
      ...(isRecord(body.uploads) ? { uploads: body.uploads as never } : {}),
      ...(idempotencyKey ? { idempotencyKey } : {}),
      security: {
        originKey: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || request.headers.get('x-real-ip')
          || 'unknown',
        identityKey: request.headers.get('x-user-id') || undefined,
        honeypotValue: security.honeypotValue,
        captchaToken: typeof security.captchaToken === 'string' ? security.captchaToken : undefined,
        consent: isRecord(security.consent)
          ? {
              accepted: security.consent.accepted === true,
              ...(typeof security.consent.policyVersion === 'string' ? { policyVersion: security.consent.policyVersion } : {}),
            }
          : undefined,
      },
    })

    if (result.outcome === 'securityFailure') {
      const securityHeaders = new Headers(responseHeaders)
      if (result.security.retryAfterSeconds !== undefined) securityHeaders.set('Retry-After', String(result.security.retryAfterSeconds))
      return NextResponse.json({ code: result.security.code, message: result.security.message }, {
        status: result.security.code === 'RATE_LIMITED' ? 429 : 400,
        headers: securityHeaders,
      })
    }
    if (result.outcome === 'duplicate') return json({ success: true, duplicate: true, ...result.original }, 200, responseHeaders)

    return json({
      success: true,
      submissionId: result.submission.id,
      leadId: result.leadId,
      deliveryStatus: result.deliveryStatus,
    }, result.outcome === 'deliveryPending' ? 202 : 200, responseHeaders)
  } catch (error) {
    if (error instanceof LegacyFormMappingError) return json({ error: 'Legacy form cannot be migrated', message: error.message }, 422, headers)
    console.error('Legacy form submission error:', error instanceof Error ? error.message : error)
    return json({ error: 'Internal Server Error' }, 500, headers)
  }
}

function deprecationHeaders(canonicalFormId?: string): HeadersInit {
  return {
    Deprecation: 'true',
    Sunset: process.env.FORMS_LEGACY_SUNSET || 'Thu, 31 Dec 2026 23:59:59 GMT',
    Link: `</api/forms/${canonicalFormId || '{canonical-id}'}/submissions>; rel="successor-version"`,
  }
}

function json(body: unknown, status: number, headers: HeadersInit): NextResponse {
  return NextResponse.json(body, { status, headers })
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
