import prisma from '@/lib/prisma'
import type { Lead, LeadRepositoryPort } from './contracts'

interface LeadRecordClient {
  findUnique(args: unknown): Promise<unknown>
  findMany(args: unknown): Promise<unknown[]>
  upsert(args: unknown): Promise<unknown>
}

export class PrismaLeadRepository implements LeadRepositoryPort {
  private readonly client: LeadRecordClient

  constructor(client: LeadRecordClient = prisma.leadRecord as unknown as LeadRecordClient) {
    this.client = client
  }

  async findById(id: string): Promise<Lead | undefined> {
    const row = await this.client.findUnique({ where: { id } })
    return row ? toLead(row) : undefined
  }

  async findBySourceSubmissionId(sourceSubmissionId: string): Promise<Lead | undefined> {
    const row = await this.client.findUnique({ where: { sourceSubmissionId } })
    return row ? toLead(row) : undefined
  }

  async save(lead: Lead): Promise<void> {
    await this.client.upsert({
      where: { sourceSubmissionId: lead.sourceSubmissionId },
      create: toPersistence(lead),
      update: toPersistence(lead),
    })
  }

  async list(): Promise<Lead[]> {
    const rows = await this.client.findMany({ orderBy: { createdAt: 'desc' } })
    return rows.map(toLead)
  }
}

function toPersistence(lead: Lead) {
  return {
    id: lead.id,
    sourceSubmissionId: lead.sourceSubmissionId,
    sourceFormId: lead.sourceFormId,
    ...(lead.formSlug ? { formSlug: lead.formSlug } : {}),
    data: lead.data,
    status: lead.status,
    version: lead.version,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  }
}

function toLead(value: unknown): Lead {
  const row = value as Record<string, unknown>
  return {
    id: String(row.id),
    sourceSubmissionId: String(row.sourceSubmissionId),
    sourceFormId: String(row.sourceFormId),
    ...(row.formSlug ? { formSlug: String(row.formSlug) } : {}),
    data: row.data as Record<string, unknown>,
    status: row.status as Lead['status'],
    version: Number(row.version),
    createdAt: new Date(String(row.createdAt)),
    updatedAt: new Date(String(row.updatedAt)),
  }
}
