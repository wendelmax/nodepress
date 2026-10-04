import { describe, expect, it } from 'vitest'
import {
  normalizeResponsive,
  validateBuilderLayoutDocument,
  validateLayoutProps,
} from '../schema'

const validSectionProps = {
  content: [],
  as: 'section',
  ariaLabel: '',
  padding: { desktop: 16 },
  background: 'surface',
  overlay: 'transparent',
  border: 'none',
  radius: { desktop: 0 },
  visibility: { desktop: true },
}

describe('responsive layout schema', () => {
  it('normalizes a scalar and inherits tablet/mobile values', () => {
    expect(normalizeResponsive(16)).toEqual({ desktop: 16, tablet: 16, mobile: 16 })
    expect(normalizeResponsive({ desktop: 24, mobile: 8 })).toEqual({
      desktop: 24,
      tablet: 24,
      mobile: 8,
    })
  })

  it('accepts the documented limits and semantic values', () => {
    expect(validateLayoutProps('Section', {
      ...validSectionProps,
      padding: { desktop: 256, tablet: 0, mobile: 128 },
      radius: { desktop: 0 },
      visibility: { desktop: true, tablet: false, mobile: true },
    })).toEqual({ valid: true })

    expect(validateLayoutProps('Container', {
      content: [],
      as: 'main',
      ariaLabel: 'Main content',
      maxWidth: { desktop: '2xl' },
      align: { desktop: 'center' },
      padding: { desktop: 256 },
      visibility: { desktop: true },
    })).toEqual({ valid: true })
  })

  it('rejects incomplete responsive values, unsafe colors and arbitrary styles', () => {
    expect(validateLayoutProps('Section', {
      ...validSectionProps,
      padding: { tablet: 12 },
    })).toMatchObject({ valid: false })

    expect(validateLayoutProps('Section', {
      ...validSectionProps,
      background: 'url(https://evil.example/style.css)',
    })).toMatchObject({ valid: false })

    expect(validateLayoutProps('Section', {
      ...validSectionProps,
      style: 'color:red',
    })).toMatchObject({ valid: false })

    expect(validateLayoutProps('Container', {
      content: [],
      as: 'script',
      maxWidth: { desktop: 'wide' },
      align: { desktop: 'center' },
      padding: { desktop: 257.5 },
      visibility: { desktop: true, phone: true },
    })).toMatchObject({ valid: false })
  })

  it('validates nested layout nodes and reports every invalid path', () => {
    const result = validateBuilderLayoutDocument({
      version: 1,
      root: {},
      metadata: { editor: 'puck', schemaVersion: 1 },
      content: [{
        type: 'Section',
        props: {
          ...validSectionProps,
          content: [{
            type: 'Columns',
            props: {
              column1: [{
                type: 'Stack',
                props: {
                  content: [],
                  as: 'div',
                  direction: { desktop: 'column' },
                  gap: { desktop: 129 },
                  align: { desktop: 'left' },
                  justify: { desktop: 'start' },
                  wrap: { desktop: false },
                  visibility: { desktop: true },
                },
              }],
              columns: { desktop: 2 },
              gap: { desktop: 16 },
              align: { desktop: 'stretch' },
              stackOnMobile: true,
              visibility: { desktop: true },
            },
          }],
        },
      }],
    })

    expect(result.valid).toBe(false)
    if (result.valid) return

    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('content[0].props.column1[0].props.gap'),
    ]))
  })
})
