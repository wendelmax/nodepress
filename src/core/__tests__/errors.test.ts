import { describe, expect, it, vi } from 'vitest'
import { errorResponse, toPublicError } from '../errors'

describe('public error boundary', () => {
  it('maps internal database details to a stable error without leaking SQL or stack traces', async () => {
    const error = new Error('PrismaClientKnownRequestError: SELECT * FROM np_users WHERE password = secret')
    error.stack = 'Error: leaked stack\n at database.ts:10'

    const response = errorResponse(error, 'Request failed')
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Request failed', code: 'INTERNAL_ERROR' })
    expect(JSON.stringify(body)).not.toMatch(/SELECT|np_users|leaked stack|secret/i)
  })

  it('preserves safe validation and conflict codes', () => {
    expect(toPublicError(new Error('Content slug already exists'))).toEqual({
      code: 'CONFLICT',
      message: 'The requested operation conflicts with the current state',
      status: 409,
    })
    expect(toPublicError(new Error('Content title is required'))).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'The request could not be validated',
      status: 400,
    })
  })

  it('logs structured failures without changing the public response', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    errorResponse(new Error('secret database failure'), 'Failed', { requestId: 'req-1', pluginId: 'animals' })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"requestId":"req-1"'))
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('"pluginId":"animals"'))
    spy.mockRestore()
  })
})
