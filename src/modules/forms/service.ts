import type {
  CreateFormInput,
  FormDefinition,
  FormStatus,
  FormSubmission,
  FormSubmissionInput,
  FormUploadPort,
} from './types'
import { validateFormDefinition, validateSubmission } from './validation'

export interface FormRepository {
  createForm(input: Omit<FormDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<FormDefinition>
  findFormById(id: string): Promise<FormDefinition | undefined>
  findFormBySlug(slug: string): Promise<FormDefinition | undefined>
  createSubmission(input: Omit<FormSubmission, 'id' | 'createdAt'>): Promise<FormSubmission>
  listSubmissions(formId: string): Promise<FormSubmission[]>
}

export class FormNotFoundError extends Error {
  constructor(id: string) {
    super(`Form not found: ${id}`)
    this.name = 'FormNotFoundError'
  }
}

export class FormConflictError extends Error {
  constructor(slug: string) {
    super(`Form slug already exists: ${slug}`)
    this.name = 'FormConflictError'
  }
}

export class FormUnavailableError extends Error {
  constructor(id: string) {
    super(`Form is not active: ${id}`)
    this.name = 'FormUnavailableError'
  }
}

export class FormService {
  constructor(
    private readonly repository: FormRepository,
    private readonly uploadPort?: FormUploadPort,
  ) {}

  async create(input: CreateFormInput): Promise<FormDefinition> {
    const slug = normalizeSlug(input.slug)
    if (!slug) throw new Error('Form slug is required')
    if (!input.name.trim()) throw new Error('Form name is required')
    validateFormDefinition(input.fields)
    if (await this.repository.findFormBySlug(slug)) throw new FormConflictError(slug)

    return this.repository.createForm({
      slug,
      name: input.name.trim(),
      status: input.status ?? 'active',
      fields: input.fields,
    })
  }

  async submit(formId: string, input: FormSubmissionInput): Promise<FormSubmission> {
    const form = await this.getForm(formId)
    if (form.status !== 'active') throw new FormUnavailableError(formId)
    const payload = await validateSubmission(form, input.values, input.uploads, this.uploadPort)
    return this.repository.createSubmission({
      formId,
      payload,
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    })
  }

  async listSubmissions(formId: string): Promise<FormSubmission[]> {
    await this.getForm(formId)
    return this.repository.listSubmissions(formId)
  }

  private async getForm(formId: string): Promise<FormDefinition> {
    const form = await this.repository.findFormById(formId)
    if (!form) throw new FormNotFoundError(formId)
    return form
  }
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export type { FormStatus }
