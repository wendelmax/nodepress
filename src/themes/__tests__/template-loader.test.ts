import { describe, expect, it } from 'vitest'
import type { NodePressTheme } from '../types'
import {
  isSafeTemplateIdentifier,
  resolveArchiveTemplate,
  resolveSingleTemplate,
} from '../template-loader'

const fallbackSingle = (() => null) as NodePressTheme['SinglePost']
const customSingle = (() => null) as NodePressTheme['SinglePost']
const fallbackArchive = (() => null) as NodePressTheme['Archive']
const customArchive = (() => null) as NodePressTheme['Archive']

const theme = {
  meta: {
    name: 'Test theme',
    description: 'Test theme',
    author: 'NodePress',
    version: '1.0.0',
    slug: 'test',
  },
  SinglePost: fallbackSingle,
  SinglePage: (() => null) as NodePressTheme['SinglePage'],
  Archive: fallbackArchive,
  Single_animal: customSingle,
  Archive_animal: customArchive,
} as unknown as NodePressTheme

describe('theme template loader', () => {
  it('prioritizes a post-type single template over SinglePost', () => {
    expect(resolveSingleTemplate(theme, 'animal')).toBe(customSingle)
  })

  it('prioritizes a post-type archive template over Archive', () => {
    expect(resolveArchiveTemplate(theme, 'animal')).toBe(customArchive)
  })

  it('falls back to the public single and archive templates when no specific template exists', () => {
    expect(resolveSingleTemplate(theme, 'page')).toBe(fallbackSingle)
    expect(resolveArchiveTemplate(theme, 'page')).toBe(fallbackArchive)
  })

  it.each([
    undefined,
    '',
    '../animal',
    'animal/archive',
    'Animal',
    ['animal'],
  ])('uses the safe fallback for an invalid post type: %j', (postType) => {
    expect(resolveSingleTemplate(theme, postType)).toBe(fallbackSingle)
    expect(resolveArchiveTemplate(theme, postType)).toBe(fallbackArchive)
  })

  it('does not execute or expose a malformed dynamic template key', () => {
    const malformedTheme = {
      ...theme,
      Single_animal: 'not-a-component',
      Archive_animal: { render: 'not-a-component' },
    } as unknown as NodePressTheme

    expect(resolveSingleTemplate(malformedTheme, 'animal')).toBe(fallbackSingle)
    expect(resolveArchiveTemplate(malformedTheme, 'animal')).toBe(fallbackArchive)
  })

  it('accepts slug-shaped identifiers and rejects unsafe template identifiers', () => {
    expect(isSafeTemplateIdentifier('animal')).toBe(true)
    expect(isSafeTemplateIdentifier('animal-with-hyphens')).toBe(true)
    expect(isSafeTemplateIdentifier('animal/../post')).toBe(false)
    expect(isSafeTemplateIdentifier('../animal')).toBe(false)
    expect(isSafeTemplateIdentifier('Animal')).toBe(false)
    expect(isSafeTemplateIdentifier('')).toBe(false)
  })
})
