import type { Prisma } from '@prisma/client'
import type { PluginMigration } from '../../types'

export const createAnimalsMigration: PluginMigration = {
  id: '001-create-animals',
  async up(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`
      CREATE TABLE IF NOT EXISTS "np_animals" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(160) NOT NULL,
        "slug" VARCHAR(180) NOT NULL UNIQUE,
        "status" VARCHAR(32) NOT NULL DEFAULT 'available',
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
  },
}
