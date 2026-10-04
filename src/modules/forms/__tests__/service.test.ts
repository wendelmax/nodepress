import { beforeEach, describe, expect, it } from 'vitest'
import { FormService, type FormRepository } from '../service'
import type { FormDefinition, FormSubmission } from '../types'

describe('FormService', () => {
  let repository: MemoryFormRepository
  let service: FormService

  beforeEach(() => {
    repository = new MemoryFormRepository()
    service = new FormService(repository)
  })

  it('creates a form after validating its schema', async () => {
    const form = await service.create({
      slug: 'contact',
      name: 'Contact',
      fields: [{ name: 'email', label: 'Email', type: 'email', required: true }],
    })

    expect(form).toMatchObject({ slug: 'contact', name: 'Contact', status: 'active' })
    await expect(service.create({
      slug: 'contact',
      name: 'Other',
      fields: [],
    })).rejects.toThrow(/slug/i)
  })

  it('submits validated values and lists submissions for an existing form', async () => {
    const form = await service.create({
      slug: 'contact',
      name: 'Contact',
      fields: [{ name: 'message', label: 'Message', type: 'textarea', required: true }],
    })

    const submission = await service.submit(form.id, { values: { message: 'Hello' } })

    expect(submission).toMatchObject({ formId: form.id, payload: { message: 'Hello' } })
    await expect(service.listSubmissions(form.id)).resolves.toEqual([submission])
  })

  it('rejects submission to an unknown form', async () => {
    await expect(service.submit('missing', { values: {} })).rejects.toThrow(/not found/i)
    await expect(service.listSubmissions('missing')).rejects.toThrow(/not found/i)
  })
})

class MemoryFormRepository implements FormRepository {
  private forms: FormDefinition[] = []
  private submissions: FormSubmission[] = []
  private nextId = 1

  async createForm(input: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<FormDefinition> {
    const now = new Date()
    const form = { ...input, id: `form-${this.nextId++}`, createdAt: now, updatedAt: now }
    this.forms.push(form)
    return form
  }

  async findFormById(id: string): Promise<FormDefinition | undefined> {
    return this.forms.find((form) => form.id === id)
  }

  async findFormBySlug(slug: string): Promise<FormDefinition | undefined> {
    return this.forms.find((form) => form.slug === slug)
  }

  async createSubmission(input: Omit<FormSubmission, 'id' | 'createdAt'>): Promise<FormSubmission> {
    const submission = { ...input, id: `submission-${this.nextId++}`, createdAt: new Date() }
    this.submissions.push(submission)
    return submission
  }

  async listSubmissions(formId: string): Promise<FormSubmission[]> {
    return this.submissions.filter((submission) => submission.formId === formId)
  }
}
