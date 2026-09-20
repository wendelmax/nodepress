import { describe, expect, it, vi } from 'vitest'
import { HealthService } from '../health.service'

describe('HealthService', () => {
  it('returns healthy when every dependency is healthy', async () => {
    const report = await new HealthService([
      { name: 'database', run: async () => ({ status: 'healthy' }) },
      { name: 'plugins', run: async () => ({ status: 'healthy', details: { registered: 2 } }) },
    ]).check()

    expect(report.status).toBe('healthy')
    expect(report.checks).toHaveLength(2)
    expect(report.checks[0]?.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('returns degraded or unhealthy without exposing exception details', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const report = await new HealthService([
      { name: 'storage', run: async () => ({ status: 'degraded', details: { driver: 'local' } }) },
      { name: 'database', run: async () => { throw new Error('password=secret') } },
    ]).check()

    expect(report.status).toBe('unhealthy')
    expect(report.checks.find((check) => check.name === 'database')).toMatchObject({ status: 'unhealthy', details: { reason: 'check_failed' } })
    expect(JSON.stringify(report)).not.toContain('password=secret')
    errorSpy.mockRestore()
  })
})
