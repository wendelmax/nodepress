import { describe, expect, it } from 'vitest'
import {
  FormValidationError,
  validateFormDefinition,
  validateSubmission,
} from '../validation'
import type {
  FormDefinition,
  FormUploadPort,
  IncomingFormUpload,
  StoredFormUpload,
} from '../types'

describe('forms validation', () => {
  it('accepts a valid schema and required values', async () => {
    const form = definition([
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'age', label: 'Age', type: 'number' },
    ])

    expect(() => validateFormDefinition(form.fields)).not.toThrow()
    await expect(validateSubmission(form, { name: 'Ada', age: 37 })).resolves.toEqual({
      name: 'Ada',
      age: 37,
    })
  })

  it('rejects missing required values and invalid field types', async () => {
    const form = definition([
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'age', label: 'Age', type: 'number' },
    ])

    await expect(validateSubmission(form, {})).rejects.toMatchObject({
      code: 'INVALID_SUBMISSION',
    })
    await expect(validateSubmission(form, { email: 'not-an-email', age: '37' })).rejects.toThrow(/email|age/i)
  })

  it('evaluates conditional fields and only requires visible fields', async () => {
    const form = definition([
      { name: 'contact', label: 'Contact?', type: 'select', options: ['yes', 'no'], required: true },
      {
        name: 'phone',
        label: 'Phone',
        type: 'text',
        required: true,
        condition: { field: 'contact', operator: 'equals', value: 'yes' },
      },
    ])

    await expect(validateSubmission(form, { contact: 'no' })).resolves.toEqual({ contact: 'no' })
    await expect(validateSubmission(form, { contact: 'yes' })).rejects.toThrow(/phone/i)
    await expect(validateSubmission(form, { contact: 'yes', phone: '555-0100' })).resolves.toEqual({
      contact: 'yes',
      phone: '555-0100',
    })
  })

  it('rejects unknown fields and malformed schemas', async () => {
    const form = definition([{ name: 'name', label: 'Name', type: 'text' }])

    await expect(validateSubmission(form, { extra: 'nope' })).rejects.toThrow(/unknown/i)
    expect(() => validateFormDefinition([
      { name: 'name', label: 'Name', type: 'select', options: [] },
    ])).toThrow(FormValidationError)
  })

  it('accepts a safe upload and rejects unsafe upload metadata', async () => {
    const form = definition([{
      name: 'resume',
      label: 'Resume',
      type: 'file',
      required: true,
      upload: { maxBytes: 1024, allowedMimeTypes: ['application/pdf'] },
    }])
    const accepted: IncomingFormUpload = {
      filename: 'resume.pdf',
      mimeType: 'application/pdf',
      size: 12,
      content: new Uint8Array(12),
    }
    const uploadPort: FormUploadPort = {
      store: async () => ({
        key: 'forms/form-1/resume.pdf',
        filename: 'resume.pdf',
        mimeType: 'application/pdf',
        size: 12,
      } satisfies StoredFormUpload),
    }

    await expect(validateSubmission(form, {}, { resume: accepted }, uploadPort)).resolves.toMatchObject({
      resume: { key: 'forms/form-1/resume.pdf' },
    })
    await expect(validateSubmission(form, {}, {
      resume: { ...accepted, filename: '../secrets.txt' },
    }, uploadPort)).rejects.toThrow(/upload|filename/i)
    await expect(validateSubmission(form, {}, {
      resume: { ...accepted, mimeType: 'text/plain' },
    }, uploadPort)).rejects.toThrow(/upload|mime/i)
  })
})

function definition(fields: FormDefinition['fields']): FormDefinition {
  return {
    id: 'form-1',
    slug: 'contact',
    name: 'Contact',
    status: 'active',
    fields,
    createdAt: new Date('2026-10-04T00:00:00.000Z'),
    updatedAt: new Date('2026-10-04T00:00:00.000Z'),
  }
}
