import { createHash } from 'node:crypto'
import type {
  RateLimitDecision,
  RateLimitPolicy,
  SubmissionRateLimitKey,
  SubmissionRateLimiter,
} from './contracts'

interface RateLimitEntry {
  count: number
  windowStart: number
}

export interface InMemorySubmissionRateLimiterOptions {
  now?: () => number
}

function keyDigest(key: SubmissionRateLimitKey): string {
  return createHash('sha256')
    .update(`${key.scope}\u0000${key.value.trim()}`)
    .digest('hex')
}

function retryAfterSeconds(now: number, entry: RateLimitEntry, windowMs: number): number {
  return Math.max(1, Math.ceil((windowMs - (now - entry.windowStart)) / 1_000))
}

export class InMemorySubmissionRateLimiter implements SubmissionRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>()
  private readonly now: () => number

  constructor(options: InMemorySubmissionRateLimiterOptions = {}) {
    this.now = options.now ?? (() => Date.now())
  }

  async consume(
    keys: readonly SubmissionRateLimitKey[],
    policy: RateLimitPolicy,
  ): Promise<RateLimitDecision> {
    if (!Number.isInteger(policy.maxAttempts) || policy.maxAttempts < 1 || !Number.isFinite(policy.windowMs) || policy.windowMs <= 0) {
      return { allowed: false, retryAfterSeconds: 1 }
    }

    const now = this.now()
    const uniqueKeys = [...new Set(keys.map(keyDigest))]
    if (uniqueKeys.length === 0) return { allowed: false, retryAfterSeconds: 1 }

    const activeEntries = uniqueKeys.map((key) => {
      const entry = this.entries.get(key)
      if (!entry || now - entry.windowStart >= policy.windowMs) {
        return { key, entry: undefined }
      }
      return { key, entry }
    })

    const rejected = activeEntries.filter(({ entry }) => entry && entry.count >= policy.maxAttempts)
    if (rejected.length > 0) {
      const retryAfter = Math.max(...rejected.map(({ entry }) => retryAfterSeconds(now, entry!, policy.windowMs)))
      return { allowed: false, retryAfterSeconds: retryAfter }
    }

    for (const { key, entry } of activeEntries) {
      this.entries.set(key, {
        count: (entry?.count ?? 0) + 1,
        windowStart: entry?.windowStart ?? now,
      })
    }

    return { allowed: true, retryAfterSeconds: 0 }
  }
}
