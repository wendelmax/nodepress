import { describe, expect, it } from 'vitest'
import {
  createEmptyBuilderDocument,
  MAX_BUILDER_DOCUMENT_BYTES,
  MAX_BUILDER_DOCUMENT_DEPTH,
  parseBuilderDocument,
  serializeBuilderDocument,
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

  it('rejects oversized or excessively deep documents before rendering', () => {
    expect(parseBuilderDocument('x'.repeat(MAX_BUILDER_DOCUMENT_BYTES + 1)).kind).toBe('invalid')
    expect(parseBuilderDocument(makeNestedValue(MAX_BUILDER_DOCUMENT_DEPTH + 1)).kind).toBe('invalid')
  })

  it('keeps Editor.js and HTML content on their existing branches', () => {
    expect(parseBuilderDocument({ blocks: [] }).kind).toBe('editorjs')
    expect(parseBuilderDocument('<p>legacy</p>').kind).toBe('html')
  })
})
