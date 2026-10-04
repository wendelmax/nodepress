import type { Prisma } from '@prisma/client'
import type { PluginMigration } from '../types'

export const CONSENT_LEDGER_DDL = `
CREATE TABLE IF NOT EXISTS "np_lgpd_consents" (
  "id" BIGSERIAL PRIMARY KEY,
  "policy_version" VARCHAR(64) NOT NULL,
  "categories" JSONB NOT NULL,
  "locale" VARCHAR(16) NOT NULL,
  "decision" VARCHAR(16) NOT NULL CHECK ("decision" IN ('save', 'accept-all', 'reject-all', 'revoke')),
  "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "np_lgpd_consents_occurred_at_idx" ON "np_lgpd_consents" ("occurred_at");
`

export const createConsentMigration: PluginMigration = {
  id: '001-create-consent-ledger',
  async up(tx: Prisma.TransactionClient) {
    await tx.$executeRawUnsafe(CONSENT_LEDGER_DDL)
  },
}
