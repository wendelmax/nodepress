import { NextResponse } from 'next/server'
import { formService, type CreateFormInput } from '@/modules/forms'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return invalidRequest('Invalid JSON body')
  }
  if (!isRecord(body) || !Array.isArray(body.fields) || typeof body.slug !== 'string' || typeof body.name !== 'string') {
    return invalidRequest('Form slug, name and fields are required')
  }

  try {
    const form = await formService.create({
      slug: body.slug,
      name: body.name,
      fields: body.fields as CreateFormInput['fields'],
      ...(body.status === undefined ? {} : { status: body.status as CreateFormInput['status'] }),
    })
    return NextResponse.json(form, { status: 201 })
  } catch (error) {
    if (isInvalidRequestError(error)) return invalidRequest(error instanceof Error ? error.message : 'Invalid form')
    if (error instanceof Error && error.name === 'FormConflictError') {
      return NextResponse.json({ code: 'conflict', message: error.message }, { status: 409 })
    }
    return NextResponse.json({ code: 'internal_error', message: 'Error creating form' }, { status: 500 })
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
