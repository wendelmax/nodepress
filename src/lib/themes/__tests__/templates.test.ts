import { describe, expect, it } from 'vitest'
import { createBuilderDocument } from '@/lib/puck/document'
import {
  parseThemeTemplateDocument,
  parseThemeTemplateDraft,
  replaceThemeSlots,
  resolveThemeTemplate,
  type ThemeTemplateDefinition,
} from '../templates'

const document = createBuilderDocument({
  root: {},
  content: [{ type: 'Heading', props: { title: 'Template', level: 'h1', align: 'left' } }],
})

const template = (overrides: Partial<ThemeTemplateDefinition>): ThemeTemplateDefinition => ({
  id: 'default-template',
  themeSlug: 'default',
  area: 'single',
  name: 'Default template',
  conditions: {},
  priority: 0,
  enabled: true,
  version: 1,
  document,
  ...overrides,
})

describe('theme template contracts', () => {
  it('validates drafts before preview or activation', () => {
    const result = parseThemeTemplateDraft({
      id: 'single-post', themeSlug: 'default', area: 'single', name: 'Single Post',
      conditions: { postType: 'post' }, priority: 10, enabled: false, document,
    }, new Set(['Heading', 'ThemeSlot']))

    expect(result.valid).toBe(true)
  })

  it('rejects invalid documents and unavailable components', () => {
    const result = parseThemeTemplateDocument({
      version: 1,
      root: {},
      content: [{ type: 'Unknown', props: {} }],
      metadata: { editor: 'puck', schemaVersion: 1 },
    }, new Set(['Heading', 'ThemeSlot']))

    expect(result).toEqual({ valid: false, reason: 'template contains unavailable components: Unknown' })
  })

  it('resolves the most specific matching template deterministically', () => {
    const result = resolveThemeTemplate([
      template({ id: 'fallback', conditions: {} }),
      template({ id: 'post', conditions: { postType: 'post' } }),
      template({ id: 'taxonomy', conditions: { taxonomy: { taxonomy: 'category', slug: 'news' } } }),
      template({ id: 'slug', conditions: { slug: 'hello' }, priority: 1 }),
    ], {
      themeSlug: 'default', area: 'single', context: 'post', postType: 'post', slug: 'hello',
      taxonomies: [{ taxonomy: 'category', slug: 'news' }],
    })

    expect(result?.id).toBe('slug')
  })

  it('ignores disabled templates and templates from another theme', () => {
    const result = resolveThemeTemplate([
      template({ id: 'disabled', enabled: false }),
      template({ id: 'other-theme', themeSlug: 'minimal' }),
    ], { themeSlug: 'default', area: 'single', context: 'post' })

    expect(result).toBeNull()
  })
})

describe('theme slots', () => {
  it('replaces only declared ThemeSlot nodes and flattens injected content', () => {
    const source = createBuilderDocument({
      root: {},
      content: [{
        type: 'ThemeSlot',
        props: { slot: 'content', content: [] },
      }],
    })
    const result = replaceThemeSlots(source, {
      content: [{ type: 'Heading', props: { title: 'Injected', level: 'h2', align: 'left' } }],
    })

    expect(result.content).toEqual([{ type: 'Heading', props: { title: 'Injected', level: 'h2', align: 'left' } }])
  })
})
