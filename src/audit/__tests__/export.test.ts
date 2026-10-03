import { describe, expect, it } from 'vitest'
import { escapeCsvValue, serializeAuditLogs } from '@/audit/export'

const rows = [{
  id: 1,
  actorUserId: 7,
  tenantId: null,
  action: 'post.updated',
  resourceType: 'post',
  resourceId: '42',
  success: true,
  correlationId: 'request-1',
  ipSummary: '203.0.113.0',
  metadata: { title: 'Hello, "world"' },
  occurredAt: new Date('2026-10-03T00:00:00.000Z'),
  createdAt: new Date('2026-10-03T00:00:00.000Z'),
}]

describe('serializeAuditLogs', () => {
  it('serializes JSON without changing date values to invalid objects', () => {
    expect(JSON.parse(serializeAuditLogs(rows, 'json'))).toMatchObject({
      items: [{ id: 1, action: 'post.updated', resourceId: '42' }],
    })
  })

  it('escapes CSV fields containing commas and quotes', () => {
    const csv = serializeAuditLogs(rows, 'csv')

    expect(csv).toContain('id,actorUserId,tenantId,action,resourceType,resourceId,success,correlationId,ipSummary,metadata,occurredAt,createdAt')
    expect(escapeCsvValue('Hello, "world"')).toBe('"Hello, ""world"""')
  })
})
