import { describe, expect, it } from 'vitest'
import {
  createPatternReference,
  parsePatternPackage,
  resolvePatternReferences,
  type PatternPackage,
} from '../patterns'
import { defaultPatterns } from '../default-patterns'
import { createBuilderDocument } from '../document'

const allowedComponents = new Set(['Heading', 'Section', 'PatternReference'])

function packageFixture(overrides: Partial<PatternPackage> = {}): PatternPackage {
  return {
    manifest: {
      format: 'nodepress-pattern',
      formatVersion: 1,
      id: 'hero-home',
      name: 'Hero Home',
      description: 'Reusable hero',
      kind: 'section',
      category: 'Landing pages',
      tags: ['hero', 'home'],
      engine: '>=1.0.0',
      schemaVersion: 1,
      version: 1,
    },
    document: createBuilderDocument({
      root: {},
      content: [{ type: 'Heading', props: { title: 'Hello', level: 'h1', align: 'left' } }],
    }),
    ...overrides,
  }
}

describe('pattern packages', () => {
  it('ships safe starter patterns for the main site types', () => {
    expect(defaultPatterns).toHaveLength(4)
    for (const pattern of defaultPatterns) {
      expect(parsePatternPackage(pattern, new Set(['Heading', 'Text', 'Section'])).valid).toBe(true)
    }
  })

  it('accepts a compatible package with registered components', () => {
    const result = parsePatternPackage(packageFixture(), allowedComponents)

    expect(result.valid).toBe(true)
    if (result.valid) expect(result.package.manifest.id).toBe('hero-home')
  })

  it('rejects unknown components before persistence', () => {
    const pattern = packageFixture({
      document: createBuilderDocument({
        root: {},
        content: [{ type: 'DangerousWidget', props: {} }],
      }),
    })

    const result = parsePatternPackage(pattern, allowedComponents)

    expect(result).toEqual({
      valid: false,
      reason: 'pattern document contains unavailable components: DangerousWidget',
    })
  })

  it('rejects incompatible engine and malformed manifest values', () => {
    const result = parsePatternPackage(packageFixture({
      manifest: { ...packageFixture().manifest, engine: '>=2.0.0', kind: 'unknown' as never },
    }), allowedComponents)

    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toContain('pattern kind is invalid')
  })

  it('creates a reference node without executable fields', () => {
    expect(createPatternReference('hero-home', 2)).toEqual({
      type: 'PatternReference',
      props: { patternId: 'hero-home', version: 2 },
    })
  })
})

describe('pattern reference resolution', () => {
  it('resolves references recursively with a bounded lookup', async () => {
    const source = createBuilderDocument({
      root: {},
      content: [createPatternReference('hero-home')],
    })
    const resolved = await resolvePatternReferences(source, async (id) => {
      if (id !== 'hero-home') return null
      return createBuilderDocument({
        root: {},
        content: [{ type: 'Heading', props: { title: 'Resolved', level: 'h2', align: 'left' } }],
      })
    })

    expect(resolved.content).toEqual([
      { type: 'Heading', props: { title: 'Resolved', level: 'h2', align: 'left' } },
    ])
  })

  it('keeps a missing or cyclic reference as a safe node', async () => {
    const source = createBuilderDocument({
      root: {},
      content: [createPatternReference('missing')],
    })
    const resolved = await resolvePatternReferences(source, async () => null)

    expect(resolved.content).toEqual([createPatternReference('missing')])
  })

  it('does not recurse forever when references form a cycle', async () => {
    const resolved = await resolvePatternReferences(
      createBuilderDocument({ root: {}, content: [createPatternReference('a')] }),
      async (id) => createBuilderDocument({ root: {}, content: [createPatternReference(id === 'a' ? 'b' : 'a')] }),
    )

    expect(resolved.content).toEqual([createPatternReference('a')])
  })
})
