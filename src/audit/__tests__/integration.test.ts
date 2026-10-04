import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ record: vi.fn() }))

vi.mock('@/audit/service', () => ({ auditLogService: { record: mocks.record } }))

import { recordAuditEvent } from '@/audit/record'

describe('audit integration boundary', () => {
  beforeEach(() => vi.clearAllMocks())

  it('adds request correlation and summarized IP without blocking the caller', () => {
    const request = new Request('https://nodepress.test/api/posts', {
      headers: { 'x-request-id': 'request-42', 'x-forwarded-for': '203.0.113.42' },
    })

    recordAuditEvent(request, {
      action: 'post.created',
      resourceType: 'post',
      resourceId: '7',
      actorUserId: 3,
      success: true,
    })

    expect(mocks.record).toHaveBeenCalledWith({
      action: 'post.created',
      resourceType: 'post',
      resourceId: '7',
      actorUserId: 3,
      success: true,
      correlationId: 'request-42',
      ipSummary: '203.0.113.0',
    })
  })

  it('supports authentication events without a request object', () => {
    recordAuditEvent(undefined, {
      action: 'auth.login.failed',
      resourceType: 'auth',
      success: false,
      metadata: { provider: 'credentials' },
    })

    expect(mocks.record).toHaveBeenCalledWith({
      action: 'auth.login.failed',
      resourceType: 'auth',
      success: false,
      metadata: { provider: 'credentials' },
    })
  })
})
