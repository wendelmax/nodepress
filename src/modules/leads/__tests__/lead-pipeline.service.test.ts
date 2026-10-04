import { describe, expect, it } from 'vitest'
import {
  InMemoryLeadRepository,
  LeadPipelineService,
  type LeadEvent,
  type LeadEventPublisherPort,
  type SubmissionInput,
} from '../index'

const firstSubmission: SubmissionInput = {
  id: 101,
  formId: 'contact',
  formSlug: 'contact-us',
  data: { name: 'Ada Lovelace', email: 'ada@example.test' },
  occurredAt: new Date('2026-10-04T10:00:00.000Z'),
}

function createPipeline(events: LeadEvent[] = []) {
  const publisher: LeadEventPublisherPort = {
    async publish(event) {
      events.push(event)
    },
  }

  return {
    events,
    pipeline: new LeadPipelineService({
      repository: new InMemoryLeadRepository(),
      publisher,
      idGenerator: (() => {
        let index = 0
        return () => `lead-${++index}`
      })(),
      eventIdGenerator: (() => {
        let index = 0
        return () => `event-${++index}`
      })(),
      now: () => new Date('2026-10-04T10:30:00.000Z'),
    }),
  }
}

describe('LeadPipelineService', () => {
  it('creates a new lead and publishes a creation event', async () => {
    const { pipeline, events } = createPipeline()

    const result = await pipeline.createFromSubmission(firstSubmission)

    expect(result.created).toBe(true)
    expect(result.lead).toMatchObject({
      id: 'lead-1',
      sourceSubmissionId: '101',
      sourceFormId: 'contact',
      formSlug: 'contact-us',
      status: 'new',
      version: 1,
    })
    expect(result.event).toMatchObject({
      id: 'event-1',
      type: 'lead.created',
      sequence: 1,
      lead: result.lead,
    })
    expect(events).toHaveLength(1)
  })

  it('does not duplicate a lead or event for the same submission', async () => {
    const { pipeline, events } = createPipeline()

    const first = await pipeline.createFromSubmission(firstSubmission)
    const duplicate = await pipeline.createFromSubmission({ ...firstSubmission, data: { name: 'Changed' } })

    expect(duplicate.created).toBe(false)
    expect(duplicate.lead).toEqual(first.lead)
    expect(duplicate.event).toBeUndefined()
    expect(events).toHaveLength(1)
  })

  it('lists leads in source creation order', async () => {
    const { pipeline } = createPipeline()

    await pipeline.createFromSubmission({ ...firstSubmission, id: 102, occurredAt: new Date('2026-10-04T10:02:00.000Z') })
    await pipeline.createFromSubmission({ ...firstSubmission, id: 101, occurredAt: new Date('2026-10-04T10:01:00.000Z') })

    const leads = await pipeline.list()

    expect(leads.map((lead) => lead.sourceSubmissionId)).toEqual(['101', '102'])
  })

  it('publishes monotonic versions for valid state transitions', async () => {
    const { pipeline, events } = createPipeline()
    const { lead } = await pipeline.createFromSubmission(firstSubmission)

    const contacted = await pipeline.transition(lead.id, 'contacted')
    const qualified = await pipeline.transition(lead.id, 'qualified')
    const converted = await pipeline.transition(lead.id, 'converted')

    expect([contacted.lead.status, qualified.lead.status, converted.lead.status]).toEqual([
      'contacted',
      'qualified',
      'converted',
    ])
    expect([contacted.lead.version, qualified.lead.version, converted.lead.version]).toEqual([2, 3, 4])
    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3, 4])
  })

  it('rejects backward and terminal state transitions', async () => {
    const { pipeline } = createPipeline()
    const { lead } = await pipeline.createFromSubmission(firstSubmission)

    await pipeline.transition(lead.id, 'contacted')
    await pipeline.transition(lead.id, 'qualified')
    await expect(pipeline.transition(lead.id, 'new')).rejects.toThrow('Invalid lead transition')

    await pipeline.transition(lead.id, 'converted')
    await expect(pipeline.transition(lead.id, 'contacted')).rejects.toThrow('Invalid lead transition')
  })
})

