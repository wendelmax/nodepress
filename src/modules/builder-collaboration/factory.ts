import prisma from '@/lib/prisma'
import { BuilderService } from './service'
import { PrismaBuilderRepository, PrismaBuilderSourceAdapter, type PrismaLikeClient } from './repository'

const globalForBuilder = globalThis as typeof globalThis & {
  __nodePressBuilderService?: BuilderService
}

export function getBuilderService(): BuilderService {
  if (!globalForBuilder.__nodePressBuilderService) {
    const client = prisma as unknown as PrismaLikeClient
    globalForBuilder.__nodePressBuilderService = new BuilderService({
      repository: new PrismaBuilderRepository(client),
      source: new PrismaBuilderSourceAdapter(client),
    })
  }
  return globalForBuilder.__nodePressBuilderService
}
