import { logger } from './logger'

export type NodePressErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'

export class NodePressError extends Error {
  constructor(
    public readonly code: NodePressErrorCode,
    message: string,
    public readonly status: number,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'NodePressError'
  }
}

export function toPublicError(error: unknown, fallback = 'Internal server error'): { code: NodePressErrorCode; message: string; status: number } {
  if (error instanceof NodePressError) return { code: error.code, message: error.message, status: error.status }
  const detail = error instanceof Error ? error.message : ''
  if (/forbidden/i.test(detail)) return { code: 'FORBIDDEN', message: 'Forbidden', status: 403 }
  if (/unauthorized|unauthenticated/i.test(detail)) return { code: 'UNAUTHORIZED', message: 'Unauthorized', status: 401 }
  if (/not found|unknown plugin/i.test(detail)) return { code: 'NOT_FOUND', message: 'Resource not found', status: 404 }
  if (/already exists|dependency|migration|checksum|active/i.test(detail)) return { code: 'CONFLICT', message: 'The requested operation conflicts with the current state', status: 409 }
  if (/required|invalid|unknown content|slug|version|mapping|payload/i.test(detail)) return { code: 'VALIDATION_ERROR', message: 'The request could not be validated', status: 400 }
  return { code: 'INTERNAL_ERROR', message: fallback, status: 500 }
}

export function errorResponse(error: unknown, fallback: string, context?: Record<string, unknown>): Response {
  const publicError = toPublicError(error, fallback)
  logger.error('api.request_failed', { ...context, code: publicError.code, error })
  return Response.json({ error: publicError.message, code: publicError.code }, { status: publicError.status })
}
