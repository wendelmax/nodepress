import { NextResponse } from 'next/server'
import { formService, getFormSubmissionOrchestrator } from '@/modules/forms'

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return invalidRequest('Invalid JSON body')
  }
  if (!isRecord(body) || !isRecord(body.values)) return invalidRequest('Submission values are required')

  try {
    const securityBody = isRecord(body.security) ? body.security : {}
    const orchestrator = await getFormSubmissionOrchestrator()
    const result = await orchestrator.submit({
      formId: id,
      values: body.values,
      ...(isRecord(body.uploads) ? { uploads: body.uploads as never } : {}),
      ...(typeof body.idempotencyKey === 'string' ? { idempotencyKey: body.idempotencyKey } : {}),
      security: {
        originKey: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
          || request.headers.get('x-real-ip')
          || 'unknown',
        identityKey: request.headers.get('x-user-id') || undefined,
        honeypotValue: securityBody.honeypotValue,
        captchaToken: typeof securityBody.captchaToken === 'string' ? securityBody.captchaToken : undefined,
        consent: isRecord(securityBody.consent)
          ? {
              accepted: securityBody.consent.accepted === true,
              ...(typeof securityBody.consent.policyVersion === 'string' ? { policyVersion: securityBody.consent.policyVersion } : {}),
            }
          : undefined,
      },
    })

    if (result.outcome === 'securityFailure') {
      const status = result.security.code === 'RATE_LIMITED' ? 429 : 400
      const response = NextResponse.json({ code: result.security.code, message: result.security.message }, { status })
      if (result.security.retryAfterSeconds !== undefined) response.headers.set('Retry-After', String(result.security.retryAfterSeconds))
      return response
    }
    if (result.outcome === 'duplicate') {
      return NextResponse.json({ success: true, duplicate: true, ...result.original }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      submissionId: result.submission.id,
      leadId: result.leadId,
      deliveryStatus: result.deliveryStatus,
    }, { status: result.outcome === 'deliveryPending' ? 202 : 201 })
  } catch (error) {
    if (isInvalidRequestError(error)) return invalidRequest(error instanceof Error ? error.message : 'Invalid submission')
    if (error instanceof Error && error.name === 'FormNotFoundError') {
      return NextResponse.json({ code: 'not_found', message: error.message }, { status: 404 })
    }
    if (error instanceof Error && error.name === 'FormUnavailableError') {
      return NextResponse.json({ code: 'conflict', message: error.message }, { status: 409 })
    }
    return NextResponse.json({ code: 'internal_error', message: 'Error creating submission' }, { status: 500 })
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params
  try {
    return NextResponse.json(await formService.listSubmissions(id))
  } catch (error) {
    if (error instanceof Error && error.name === 'FormNotFoundError') {
      return NextResponse.json({ code: 'not_found', message: error.message }, { status: 404 })
    }
    return NextResponse.json({ code: 'internal_error', message: 'Error listing submissions' }, { status: 500 })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInvalidRequestError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error && String(error.code).startsWith('INVALID')) return true
  return error instanceof Error && /required|invalid|unknown|duplicate|select|condition|upload/i.test(error.message)
}

function invalidRequest(message: string): NextResponse {
  return NextResponse.json({ code: 'invalid_request', message }, { status: 400 })
}
