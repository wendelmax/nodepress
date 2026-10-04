import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import type { ConsentEvent } from './consent-service'

export interface ConsentRepository {
  append(event: ConsentEvent): Promise<void>
  prune(before: Date): Promise<number>
}

interface ConsentDatabase {
  $executeRaw(query: Prisma.Sql): Promise<number>
}

export function createConsentRepository(database: ConsentDatabase = prisma): ConsentRepository {
  return {
    async append(event) {
      await database.$executeRaw(Prisma.sql`
        INSERT INTO "np_lgpd_consents" ("policy_version", "categories", "locale", "decision", "occurred_at")
        VALUES (${event.policyVersion}, ${JSON.stringify(event.choices)}::jsonb, ${event.locale}, ${event.decision}, ${event.occurredAt}::timestamptz)
      `)
    },
    async prune(before) {
      return database.$executeRaw(Prisma.sql`
        DELETE FROM "np_lgpd_consents" WHERE "occurred_at" < ${before}
      `)
    },
  }
}
