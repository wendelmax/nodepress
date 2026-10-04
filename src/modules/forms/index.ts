import { PrismaFormRepository } from './prisma-repository'
import { FormService } from './service'
import { FormSubmissionOrchestrator } from './submission-orchestrator'
import { PrismaFormSubmissionIdempotencyRepository } from './prisma-submission-repository'
import { LeadPipelineService } from '@/modules/leads'
import { PrismaLeadRepository } from '@/modules/leads'
import { PrismaDeliveryRepository } from '@/modules/delivery'

export * from './types'
export * from './validation'
export * from './service'
export * from './prisma-repository'
export * from './submission-orchestrator'
export * from './prisma-submission-repository'

export const formService = new FormService(new PrismaFormRepository())

let orchestratorPromise: Promise<FormSubmissionOrchestrator> | undefined

export async function getFormSubmissionOrchestrator(): Promise<FormSubmissionOrchestrator> {
  orchestratorPromise ??= (async () => {
    const { createSubmissionSecurityRuntime } = await import('@/security/submissions/factory')
    const security = await createSubmissionSecurityRuntime()
    const leads = new LeadPipelineService({ repository: new PrismaLeadRepository() })
    const deliveries = new PrismaDeliveryRepository()
    return new FormSubmissionOrchestrator({
      forms: formService,
      security: security.service,
      securityPolicy: security.policy,
      leads,
      delivery: {
        async enqueue(event) {
          await deliveries.enqueue({
            eventId: event.id,
            targetId: 'webhook:default',
            payload: event as unknown as Record<string, unknown>,
          })
          return { status: 'pending' }
        },
      },
      idempotency: new PrismaFormSubmissionIdempotencyRepository(),
    })
  })()
  return orchestratorPromise
}
