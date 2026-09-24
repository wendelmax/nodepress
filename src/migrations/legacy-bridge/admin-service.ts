import { randomUUID } from 'node:crypto'
import prisma from '@/lib/prisma'
import { NodePressError } from '@/core/errors'
import { bridgeResources, type BridgeResource } from './contracts'
import type { CutoverState } from './cutover-state'
import { cutoverStates, transition } from './cutover-state'

export interface StartMigrationInput {
  resource: BridgeResource
  runId: string
  watermark?: string
}

export interface ChangeCutoverInput {
  domain: string
  to: CutoverState
  changedBy?: string
  reason?: string
  reconciliation?: { status: 'passed' | 'failed'; blockingErrors: string[] }
}

export interface MigrationAdminService {
  listRuns(resource?: string): Promise<unknown[]>
  startRun(input: StartMigrationInput): Promise<unknown>
  cancelRun(runId: string): Promise<unknown>
  getCutover(domain: string): Promise<unknown>
  changeCutover(input: ChangeCutoverInput): Promise<unknown>
}

export class PrismaMigrationAdminService implements MigrationAdminService {
  async listRuns(resource?: string): Promise<unknown[]> {
    return prisma.migrationRun.findMany({
      where: resource ? { resource } : undefined,
      orderBy: { startedAt: 'desc' },
      take: 100,
    })
  }

  async startRun(input: StartMigrationInput): Promise<unknown> {
    if (!bridgeResources.includes(input.resource)) throw new NodePressError('VALIDATION_ERROR', 'Invalid migration resource', 400)
    if (!input.runId.trim()) throw new NodePressError('VALIDATION_ERROR', 'Migration run id is required', 400)
    return prisma.migrationRun.create({
      data: {
        runId: input.runId,
        resource: input.resource,
        status: 'running',
        watermark: input.watermark ? new Date(input.watermark) : undefined,
      },
    })
  }

  async cancelRun(runId: string): Promise<unknown> {
    return prisma.migrationRun.update({
      where: { runId },
      data: { status: 'failed', finishedAt: new Date() },
    })
  }

  async getCutover(domain: string): Promise<unknown> {
    return (await prisma.cutoverDomain.findUnique({ where: { domain } })) ?? { domain, state: 'shadow' }
  }

  async changeCutover(input: ChangeCutoverInput): Promise<unknown> {
    if (!input.domain.trim()) throw new NodePressError('VALIDATION_ERROR', 'Cutover domain is required', 400)
    if (!cutoverStates.includes(input.to)) throw new NodePressError('VALIDATION_ERROR', 'Invalid cutover state', 400)
    if (input.to === 'active' && (input.reconciliation?.status !== 'passed' || input.reconciliation.blockingErrors.length > 0)) {
      throw new NodePressError('CONFLICT', 'Cutover blocked by reconciliation errors', 409)
    }

    const current = await prisma.cutoverDomain.findUnique({ where: { domain: input.domain } })
    const from = (current?.state ?? 'shadow') as CutoverState
    if (!cutoverStates.includes(from)) throw new NodePressError('CONFLICT', 'Invalid current cutover state', 409)
    let next: CutoverState
    try {
      next = transition(from, input.to)
    } catch {
      throw new NodePressError('CONFLICT', `Invalid cutover transition: ${from} -> ${input.to}`, 409)
    }

    return prisma.cutoverDomain.upsert({
      where: { domain: input.domain },
      create: {
        id: randomUUID().slice(0, 30),
        domain: input.domain,
        state: next,
        changedAt: new Date(),
        changedBy: input.changedBy,
        reason: input.reason,
      },
      update: {
        state: next,
        changedAt: new Date(),
        changedBy: input.changedBy,
        reason: input.reason,
      },
    })
  }
}

let service: MigrationAdminService | undefined

export function getMigrationAdminService(): MigrationAdminService {
  service ??= new PrismaMigrationAdminService()
  return service
}
