import { describe, expect, it } from 'vitest'
import { InMemorySubmissionRateLimiter } from './in-memory-rate-limiter'
import type { RateLimitPolicy, SubmissionRateLimitKey } from './contracts'

const policy: RateLimitPolicy = { maxAttempts: 2, windowMs: 1_000 }

function origin(value: string): SubmissionRateLimitKey {
  return { scope: 'origin', value }
}

function identity(value: string): SubmissionRateLimitKey {
  return { scope: 'identity', value }
}

describe('InMemorySubmissionRateLimiter', () => {
  it('keeps origin buckets independent', async () => {
    const limiter = new InMemorySubmissionRateLimiter({ now: () => 0 })

    await expect(limiter.consume([origin('origin-a')], { maxAttempts: 1, windowMs: 1_000 })).resolves.toMatchObject({ allowed: true })
    await expect(limiter.consume([origin('origin-a')], { maxAttempts: 1, windowMs: 1_000 })).resolves.toMatchObject({ allowed: false })
    await expect(limiter.consume([origin('origin-b')], { maxAttempts: 1, windowMs: 1_000 })).resolves.toMatchObject({ allowed: true })
  })

  it('limits an identity independently across different origins', async () => {
    const limiter = new InMemorySubmissionRateLimiter({ now: () => 0 })
    const identityPolicy = { maxAttempts: 1, windowMs: 1_000 }

    await expect(limiter.consume([origin('origin-a'), identity('user-a')], identityPolicy)).resolves.toMatchObject({ allowed: true })
    await expect(limiter.consume([origin('origin-b'), identity('user-a')], identityPolicy)).resolves.toMatchObject({ allowed: false })
    await expect(limiter.consume([origin('origin-b'), identity('user-b')], identityPolicy)).resolves.toMatchObject({ allowed: true })
  })

  it('does not partially consume keys when one combined bucket is already limited', async () => {
    const limiter = new InMemorySubmissionRateLimiter({ now: () => 0 })
    const atomicPolicy = { maxAttempts: 1, windowMs: 1_000 }

    await expect(limiter.consume([origin('origin-a')], atomicPolicy)).resolves.toMatchObject({ allowed: true })
    await expect(limiter.consume([origin('origin-a'), identity('user-b')], atomicPolicy)).resolves.toMatchObject({ allowed: false })
    await expect(limiter.consume([identity('user-b')], atomicPolicy)).resolves.toMatchObject({ allowed: true })
  })

  it('counts duplicate scope/value keys once and allows exactly the configured maximum', async () => {
    const limiter = new InMemorySubmissionRateLimiter({ now: () => 0 })

    await expect(limiter.consume([origin('origin-a'), origin('origin-a')], policy)).resolves.toMatchObject({ allowed: true })
    await expect(limiter.consume([origin('origin-a')], policy)).resolves.toMatchObject({ allowed: true })
    await expect(limiter.consume([origin('origin-a')], policy)).resolves.toMatchObject({ allowed: false })
  })

  it('reports a positive retry window and resets at the fixed-window boundary', async () => {
    let now = 0
    const limiter = new InMemorySubmissionRateLimiter({ now: () => now })
    const oneAttempt = { maxAttempts: 1, windowMs: 1_000 }

    await expect(limiter.consume([origin('origin-a')], oneAttempt)).resolves.toMatchObject({ allowed: true })
    now = 999
    await expect(limiter.consume([origin('origin-a')], oneAttempt)).resolves.toMatchObject({
      allowed: false,
      retryAfterSeconds: 1,
    })
    now = 1_000
    await expect(limiter.consume([origin('origin-a')], oneAttempt)).resolves.toMatchObject({ allowed: true })
  })
})
