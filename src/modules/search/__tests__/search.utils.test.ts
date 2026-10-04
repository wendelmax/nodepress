import { describe, expect, it } from 'vitest'
import {
  buildSearchPage,
  highlightSearchText,
  normalizeSearchQuery,
  normalizeSearchText,
  scoreSearchDocument,
} from '../search.utils'
import type { SearchDocument } from '../search.types'

const publishedPost = (overrides: Partial<SearchDocument> = {}): SearchDocument => ({
  sourceKey: 'post:1',
  kind: 'post',
  type: 'post',
  id: '1',
  title: 'Adoção responsável de cães',
  slug: 'adocao-responsavel-de-caes',
  body: 'Encontre um companheiro para sua família.',
  excerpt: 'Cães disponíveis para adoção.',
  url: '/adocao-responsavel-de-caes',
  status: 'publish',
  categories: ['adoção'],
  tags: ['cães'],
  publishedAt: new Date('2026-01-02T00:00:00.000Z'),
  ...overrides,
})

describe('search query utilities', () => {
  it('normalizes accents and punctuation into searchable tokens', () => {
    expect(normalizeSearchText('  Ação — Cães!  ')).toBe('acao caes')
  })

  it('ranks title matches above body-only matches and accepts close spellings', () => {
    const titleScore = scoreSearchDocument(publishedPost(), 'adocao')
    const bodyScore = scoreSearchDocument(publishedPost({
      title: 'Histórias da comunidade',
      body: 'Veja uma adoção feliz.',
    }), 'adocao')
    const approximateScore = scoreSearchDocument(publishedPost(), 'adoca')

    expect(titleScore).toBeGreaterThan(bodyScore)
    expect(approximateScore).toBeGreaterThan(0)
  })

  it('escapes markup before wrapping matched terms', () => {
    expect(highlightSearchText('<script>alert(1)</script> Adoção', 'adocao'))
      .toBe('&lt;script&gt;alert(1)&lt;/script&gt; <mark>Adoção</mark>')
  })

  it('validates and defaults pagination without accepting oversized pages', () => {
    expect(normalizeSearchQuery({ query: 'cães' })).toMatchObject({
      query: 'cães',
      page: 1,
      pageSize: 20,
      sort: 'relevance',
      statuses: ['publish'],
    })
    expect(() => normalizeSearchQuery({ query: 'cães', pageSize: 101 })).toThrow(/page size/i)
    expect(() => normalizeSearchQuery({ query: 'cães', page: 'invalid' })).toThrow(/page/i)
    expect(() => normalizeSearchQuery({ query: '   ' })).toThrow(/query/i)
  })

  it('filters, sorts, paginates, and returns stable metadata', () => {
    const page = buildSearchPage([
      publishedPost(),
      publishedPost({
        sourceKey: 'post:2',
        id: '2',
        title: 'Notícia sem correspondência',
        slug: 'noticia-sem-correspondencia',
        body: 'Conteúdo editorial.',
        excerpt: 'Atualizações da comunidade.',
        categories: ['noticias'],
        tags: ['editorial'],
        publishedAt: new Date('2026-01-03T00:00:00.000Z'),
      }),
      publishedPost({
        sourceKey: 'post:3',
        id: '3',
        title: 'Adoção de gatos',
        slug: 'adocao-de-gatos',
        tags: ['gatos'],
        publishedAt: new Date('2026-01-01T00:00:00.000Z'),
      }),
    ], normalizeSearchQuery({ query: 'adoção', pageSize: 1 }))

    expect(page.total).toBe(2)
    expect(page.totalPages).toBe(2)
    expect(page.items).toHaveLength(1)
    expect(page.items[0]).toMatchObject({ id: '1', title: 'Adoção responsável de cães' })
    expect(page.items[0].highlights[0].fragments[0]).toContain('<mark>')
  })
})
