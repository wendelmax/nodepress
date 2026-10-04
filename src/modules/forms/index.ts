import { PrismaFormRepository } from './prisma-repository'
import { FormService } from './service'

export * from './types'
export * from './validation'
export * from './service'
export * from './prisma-repository'

export const formService = new FormService(new PrismaFormRepository())
