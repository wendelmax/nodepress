import prisma from '@/lib/prisma'
import type {
  FormSubmissionIdempotencyPort,
  FormSubmissionOrchestratedResult,
} from './submission-orchestrator'

interface FormEngineSubmissionClient {
  findFirst(args: unknown): Promise<{ orchestrationResult: unknown } | null>
  updateMany(args: unknown): Promise<{ count: number }>
}

export class PrismaFormSubmissionIdempotencyRepository implements FormSubmissionIdempotencyPort {
  private readonly client: FormEngineSubmissionClient

  constructor(client: FormEngineSubmissionClient = prisma.formEngineSubmission as unknown as FormEngineSubmissionClient) {
    this.client = client
  }

  async get(formId: string, key: string): Promise<FormSubmissionOrchestratedResult | undefined> {
    const row = await this.client.findFirst({
      where: { formId, idempotencyKey: key },
      select: { orchestrationResult: true },
    })
    return isResult(row?.orchestrationResult) ? row.orchestrationResult : undefined
  }

  async set(formId: string, key: string, result: FormSubmissionOrchestratedResult): Promise<void> {
    await this.client.updateMany({
      where: { formId, idempotencyKey: key },
      data: { orchestrationResult: result },
    })
  }
}

function isResult(value: unknown): value is FormSubmissionOrchestratedResult {
  return typeof value === 'object' && value !== null && 'outcome' in value
}
