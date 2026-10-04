export type FormStatus = 'active' | 'inactive'

export type FormFieldType = 'text' | 'email' | 'number' | 'textarea' | 'boolean' | 'select' | 'file'

export type FormConditionOperator = 'equals' | 'not_equals' | 'in' | 'not_empty'

export interface FormCondition {
  field: string
  operator: FormConditionOperator
  value?: string | number | boolean | readonly (string | number | boolean)[]
}

export interface FormUploadPolicy {
  maxBytes?: number
  allowedMimeTypes?: readonly string[]
  allowedExtensions?: readonly string[]
}

interface FormFieldBase {
  name: string
  label: string
  required?: boolean
  condition?: FormCondition
}

export type FormField =
  | (FormFieldBase & { type: 'text' | 'email' | 'textarea' })
  | (FormFieldBase & { type: 'number' })
  | (FormFieldBase & { type: 'boolean' })
  | (FormFieldBase & { type: 'select'; options: readonly string[] })
  | (FormFieldBase & { type: 'file'; upload?: FormUploadPolicy })

export interface FormDefinition {
  id: string
  slug: string
  name: string
  status: FormStatus
  fields: readonly FormField[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateFormInput {
  slug: string
  name: string
  fields: readonly FormField[]
  status?: FormStatus
}

export interface IncomingFormUpload {
  filename: string
  mimeType: string
  size: number
  content: Uint8Array
}

export interface StoredFormUpload {
  key: string
  filename: string
  mimeType: string
  size: number
  url?: string
}

export interface FormUploadPort {
  store(upload: IncomingFormUpload, policy: FormUploadPolicy, context: { formId: string; fieldName: string }): Promise<StoredFormUpload>
}

export interface FormSubmissionInput {
  values: Record<string, unknown>
  uploads?: Record<string, IncomingFormUpload>
  idempotencyKey?: string
}

export interface FormSubmission {
  id: string
  formId: string
  idempotencyKey?: string
  payload: Record<string, unknown>
  createdAt: Date
}
