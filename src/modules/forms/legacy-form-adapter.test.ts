import { describe, expect, it } from 'vitest'
import { LegacyFormMappingError, parseLegacyFormFields } from './legacy-form-adapter'

describe('legacy form adapter', () => {
  it('maps legacy checkbox fields to typed boolean fields', () => {
    expect(parseLegacyFormFields(JSON.stringify([
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'consent', label: 'Consent', type: 'checkbox', required: true },
    ]))).toEqual([
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'consent', label: 'Consent', type: 'boolean', required: true },
    ])
  })

  it('rejects malformed legacy content with a stable mapping error', () => {
    expect(() => parseLegacyFormFields('{"unexpected":true}')).toThrow(LegacyFormMappingError)
    expect(() => parseLegacyFormFields(JSON.stringify([{ label: 'Missing name', type: 'text' }]))).toThrow('field name')
  })
})
