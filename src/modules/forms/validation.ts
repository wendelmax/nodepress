import type {
  FormCondition,
  FormDefinition,
  FormField,
  FormSubmissionInput,
  FormUploadPolicy,
  FormUploadPort,
  IncomingFormUpload,
  StoredFormUpload,
} from './types'

export type FormValidationCode = 'INVALID_SCHEMA' | 'INVALID_SUBMISSION' | 'UPLOAD_REJECTED'

export class FormValidationError extends Error {
  constructor(
    public readonly code: FormValidationCode,
    message: string,
  ) {
    super(message)
    this.name = 'FormValidationError'
  }
}

const FIELD_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/

export function validateFormDefinition(fields: readonly FormField[]): void {
  const names = new Set<string>()

  for (const field of fields) {
    if (!FIELD_NAME_PATTERN.test(field.name)) throw schemaError(`Invalid form field name: ${field.name}`)
    if (names.has(field.name)) throw schemaError(`Duplicate form field name: ${field.name}`)
    names.add(field.name)
    if (!field.label.trim()) throw schemaError(`Form field label is required: ${field.name}`)

    if (field.type === 'select') {
      if (field.options.length === 0 || field.options.some((option) => !option.trim())) {
        throw schemaError(`Select field requires non-empty options: ${field.name}`)
      }
      if (new Set(field.options).size !== field.options.length) throw schemaError(`Duplicate select option: ${field.name}`)
    }

    if (field.type === 'file' && field.upload) validateUploadPolicy(field.upload, field.name)
    if (field.condition) validateCondition(field.condition, field.name, names)
  }
}

export async function validateSubmission(
  form: FormDefinition,
  values: Record<string, unknown>,
  uploads: Record<string, IncomingFormUpload> = {},
  uploadPort?: FormUploadPort,
): Promise<Record<string, unknown>> {
  validateFormDefinition(form.fields)
  const fieldMap = new Map(form.fields.map((field) => [field.name, field]))

  for (const name of Object.keys(values)) {
    if (!fieldMap.has(name)) throw submissionError(`Unknown form field: ${name}`)
  }
  for (const name of Object.keys(uploads)) {
    if (!fieldMap.has(name)) throw submissionError(`Unknown upload field: ${name}`)
    if (fieldMap.get(name)?.type !== 'file') throw submissionError(`Field does not accept uploads: ${name}`)
  }

  const payload: Record<string, unknown> = {}
  for (const field of form.fields) {
    if (!isConditionVisible(field.condition, values)) continue

    if (field.type === 'file') {
      if (field.name in values) throw submissionError(`File field must be submitted as an upload: ${field.name}`)
      const upload = uploads[field.name]
      if (!upload) {
        if (field.required) throw submissionError(`Required form field: ${field.name}`)
        continue
      }
      if (!uploadPort) throw uploadError(`Upload port is required: ${field.name}`)
      const policy = field.upload ?? {}
      validateIncomingUpload(upload, policy, field.name)
      const stored = await uploadPort.store(upload, policy, { formId: form.id, fieldName: field.name })
      validateStoredUpload(stored, upload, policy, field.name)
      payload[field.name] = stored
      continue
    }

    const value = values[field.name]
    if (isEmptyValue(value)) {
      if (field.required) throw submissionError(`Required form field: ${field.name}`)
      continue
    }
    validateFieldValue(field, value)
    payload[field.name] = value
  }

  return payload
}

function validateFieldValue(field: Exclude<FormField, { type: 'file' }>, value: unknown): void {
  const valid = (() => {
    switch (field.type) {
      case 'text':
      case 'textarea': return typeof value === 'string'
      case 'email': return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      case 'number': return typeof value === 'number' && Number.isFinite(value)
      case 'boolean': return typeof value === 'boolean'
      case 'select': return typeof value === 'string' && field.options.includes(value)
    }
  })()
  if (!valid) throw submissionError(`Invalid value for form field: ${field.name}`)
}

function validateCondition(condition: FormCondition, fieldName: string, knownNames: Set<string>): void {
  if (condition.field === fieldName) throw schemaError(`Conditional field cannot depend on itself: ${fieldName}`)
  if (!knownNames.has(condition.field)) throw schemaError(`Unknown condition field: ${condition.field}`)
  if (condition.operator === 'in' && (!Array.isArray(condition.value) || condition.value.length === 0)) {
    throw schemaError(`Condition "in" requires values: ${fieldName}`)
  }
  if (condition.operator !== 'not_empty' && condition.value === undefined) {
    throw schemaError(`Condition requires a value: ${fieldName}`)
  }
}

function isConditionVisible(condition: FormCondition | undefined, values: Record<string, unknown>): boolean {
  if (!condition) return true
  const actual = values[condition.field]
  switch (condition.operator) {
    case 'equals': return actual === condition.value
    case 'not_equals': return actual !== condition.value
    case 'in': return Array.isArray(condition.value) && condition.value.includes(actual as never)
    case 'not_empty': return !isEmptyValue(actual)
  }
}

function validateUploadPolicy(policy: FormUploadPolicy, fieldName: string): void {
  if (policy.maxBytes !== undefined && (!Number.isInteger(policy.maxBytes) || policy.maxBytes < 1)) {
    throw schemaError(`Invalid upload size policy: ${fieldName}`)
  }
  if (policy.allowedMimeTypes?.some((mime) => !mime.trim())) throw schemaError(`Invalid upload MIME policy: ${fieldName}`)
  if (policy.allowedExtensions?.some((extension) => !/^\.[a-z0-9]+$/i.test(extension))) {
    throw schemaError(`Invalid upload extension policy: ${fieldName}`)
  }
}

function validateIncomingUpload(upload: IncomingFormUpload, policy: FormUploadPolicy, fieldName: string): void {
  if (!upload.filename.trim() || upload.filename === '.' || upload.filename === '..' || /[\\/\u0000-\u001f]/.test(upload.filename)) {
    throw uploadError(`Unsafe upload filename: ${fieldName}`)
  }
  if (!Number.isInteger(upload.size) || upload.size < 0 || upload.content.byteLength !== upload.size) {
    throw uploadError(`Invalid upload size: ${fieldName}`)
  }
  if (policy.maxBytes !== undefined && upload.size > policy.maxBytes) throw uploadError(`Upload exceeds the size limit: ${fieldName}`)
  if (policy.allowedMimeTypes && !policy.allowedMimeTypes.some((allowed) => mimeMatches(allowed, upload.mimeType))) {
    throw uploadError(`Upload MIME type is not allowed: ${fieldName}`)
  }
  if (policy.allowedExtensions && !policy.allowedExtensions.some((extension) => upload.filename.toLowerCase().endsWith(extension.toLowerCase()))) {
    throw uploadError(`Upload extension is not allowed: ${fieldName}`)
  }
}

function validateStoredUpload(stored: StoredFormUpload, incoming: IncomingFormUpload, policy: FormUploadPolicy, fieldName: string): void {
  if (!stored.key.trim() || stored.key.startsWith('/') || /[\\\u0000-\u001f]/.test(stored.key) || stored.key.split('/').some((part) => part === '.' || part === '..')) {
    throw uploadError(`Upload port returned an unsafe key: ${fieldName}`)
  }
  if (stored.filename !== incoming.filename || stored.mimeType !== incoming.mimeType || stored.size !== incoming.size) {
    throw uploadError(`Upload port returned inconsistent metadata: ${fieldName}`)
  }
  validateIncomingUpload({ ...incoming, filename: stored.filename, mimeType: stored.mimeType, size: stored.size }, policy, fieldName)
}

function mimeMatches(allowed: string, actual: string): boolean {
  return allowed === actual || (allowed.endsWith('/*') && actual.startsWith(allowed.slice(0, -1)))
}

function isEmptyValue(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '')
}

function schemaError(message: string): FormValidationError {
  return new FormValidationError('INVALID_SCHEMA', message)
}

function submissionError(message: string): FormValidationError {
  return new FormValidationError('INVALID_SUBMISSION', message)
}

function uploadError(message: string): FormValidationError {
  return new FormValidationError('UPLOAD_REJECTED', message)
}
