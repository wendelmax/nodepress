import { describe, expect, it } from 'vitest'
import {
  createEmptyBuilderDocument,
  createBuilderDocument,
  canPublishBuilderDocument,
  MAX_BUILDER_DOCUMENT_BYTES,
  MAX_BUILDER_DOCUMENT_DEPTH,
  parseBuilderDocument,
  serializeBuilderDocument,
  validateBuilderComponents,
} from '../document'

function makeNestedValue(depth: number): Record<string, unknown> {
  let value: Record<string, unknown> = {}

  for (let index = 0; index < depth; index += 1) {
    value = { nested: value }
  }

  return value
}

describe('builder document contract', () => {
  it('normalizes legacy Puck data without changing its tree', () => {
    const result = parseBuilderDocument({
      root: {},
      content: [{ type: 'Heading', props: { title: 'Hi' } }],
    })

    expect(result.kind).toBe('puck')
    if (result.kind !== 'puck') return

    expect(result.document.version).toBe(1)
    expect(result.document.content).toEqual([{ type: 'Heading', props: { title: 'Hi' } }])
  })

  it('accepts canonical data and serializes it deterministically', () => {
    const document = createEmptyBuilderDocument()
    const serialized = serializeBuilderDocument(document)

    expect(parseBuilderDocument(JSON.parse(serialized)).kind).toBe('puck')
    expect(serialized).toBe(serializeBuilderDocument(createEmptyBuilderDocument()))
  })

  it('rejects unsupported versions and malformed trees', () => {
    expect(parseBuilderDocument({ version: 2, root: {}, content: [] }).kind).toBe('invalid')
    expect(parseBuilderDocument({ version: 1, root: [], content: [] }).kind).toBe('invalid')
    expect(parseBuilderDocument({ version: 1, root: {}, content: 'bad' }).kind).toBe('invalid')
  })

  it('rejects executable values in Puck documents by default', () => {
    expect(parseBuilderDocument({
      root: {},
      content: [{ type: 'CustomCode', props: { script: 'alert(1)' } }],
    })).toEqual({
      kind: 'invalid',
      reason: 'builder document contains executable code',
    })
  })

  it('rejects oversized or excessively deep documents before rendering', () => {
    expect(parseBuilderDocument('x'.repeat(MAX_BUILDER_DOCUMENT_BYTES + 1)).kind).toBe('invalid')
    expect(parseBuilderDocument(makeNestedValue(MAX_BUILDER_DOCUMENT_DEPTH + 1)).kind).toBe('invalid')
  })

  it('keeps Editor.js and HTML content on their existing branches', () => {
    expect(parseBuilderDocument({ blocks: [] }).kind).toBe('editorjs')
    expect(parseBuilderDocument('<p>legacy</p>').kind).toBe('html')
  })

  it('validates component types against the resolved component set', () => {
    const result = parseBuilderDocument({
      root: {},
      content: [
        { type: 'Heading', props: {} },
        { type: 'RemovedPluginCard', props: {} },
        { type: 'RemovedPluginCard', props: {} },
        { type: 'UnknownWidget', props: {} },
      ],
    })

    expect(result.kind).toBe('puck')
    if (result.kind !== 'puck') return

    expect(validateBuilderComponents(result.document, new Set(['Heading']))).toEqual({
      valid: false,
      unknownTypes: ['RemovedPluginCard', 'UnknownWidget'],
    })
    expect(validateBuilderComponents(result.document, new Set(['Heading', 'RemovedPluginCard', 'UnknownWidget']))).toEqual({
      valid: true,
    })
  })

  it('accepts an empty document when no component types are registered', () => {
    const result = parseBuilderDocument({ root: {}, content: [] })

    expect(result.kind).toBe('puck')
    if (result.kind !== 'puck') return

    expect(validateBuilderComponents(result.document, new Set())).toEqual({ valid: true })
  })

  it('validates component types nested inside layout slots', () => {
    const result = parseBuilderDocument({
      root: {},
      content: [{
        type: 'Section',
        props: {
          content: [{ type: 'NestedRemovedCard', props: {} }],
        },
      }, {
        type: 'Columns',
        props: {
          column2: [{ type: 'NestedUnknownWidget', props: {} }],
        },
      }],
    })

    expect(result.kind).toBe('puck')
    if (result.kind !== 'puck') return

    expect(validateBuilderComponents(result.document, new Set(['Section', 'Columns']))).toEqual({
      valid: false,
      unknownTypes: ['NestedRemovedCard', 'NestedUnknownWidget'],
    })
  })

  it('does not treat arbitrary prop metadata with a type key as a component', () => {
    const result = parseBuilderDocument({
      root: {},
      content: [{
        type: 'Widget',
        props: { metadata: { type: 'not-a-component' } },
      }],
    })

    expect(result.kind).toBe('puck')
    if (result.kind !== 'puck') return

    expect(validateBuilderComponents(result.document, new Set(['Widget']))).toEqual({ valid: true })
  })

  it('adapts published Puck data to a canonical document without losing its tree', () => {
    const document = createBuilderDocument({
      root: { title: 'Home' },
      content: [{ type: 'Heading', props: { title: 'Hello' } }],
    }, '2026-09-26T00:00:00.000Z')

    const result = parseBuilderDocument(serializeBuilderDocument(document))

    expect(result).toEqual({ kind: 'puck', document })
  })

  it('allows publishing only valid Puck content or a new empty document', () => {
    expect(canPublishBuilderDocument({ root: {}, content: [] })).toBe(true)
    expect(canPublishBuilderDocument('')).toBe(true)
    expect(canPublishBuilderDocument('{"root":')).toBe(false)
    expect(canPublishBuilderDocument({ blocks: [] })).toBe(false)
    expect(canPublishBuilderDocument('<p>legacy</p>')).toBe(false)
  })

  it('blocks publishing a Puck document with invalid layout props', () => {
    expect(canPublishBuilderDocument({
      root: {},
      content: [{
        type: 'Section',
        props: {
          content: [],
          as: 'section',
          padding: { desktop: 999 },
          background: 'surface',
          overlay: 'transparent',
          border: 'none',
          radius: { desktop: 0 },
          visibility: { desktop: true },
        },
      }],
    })).toBe(false)
  })
})
