import { logger } from '@/core/logger'

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

export interface HealthCheckResult {
  name: string
  status: HealthStatus
  details?: Record<string, unknown>
  durationMs: number
}

export interface HealthReport {
  status: HealthStatus
  checkedAt: string
  checks: HealthCheckResult[]
}

export interface HealthCheck {
  name: string
  run(): Promise<{ status: HealthStatus; details?: Record<string, unknown> }>
}

export class HealthService {
  constructor(private readonly checks: HealthCheck[]) {}

  async check(): Promise<HealthReport> {
    const results = await Promise.all(this.checks.map(async (check) => {
      const startedAt = performance.now()
      try {
        const result = await check.run()
        return { name: check.name, ...result, durationMs: Math.round(performance.now() - startedAt) }
      } catch (error) {
        logger.error('health.check_failed', { check: check.name, error })
        return {
          name: check.name,
          status: 'unhealthy' as const,
          details: { reason: 'check_failed' },
          durationMs: Math.round(performance.now() - startedAt),
        }
      }
    }))
    const status = results.some((result) => result.status === 'unhealthy')
      ? 'unhealthy'
      : results.some((result) => result.status === 'degraded')
        ? 'degraded'
        : 'healthy'
    return { status, checkedAt: new Date().toISOString(), checks: results }
  }
}
