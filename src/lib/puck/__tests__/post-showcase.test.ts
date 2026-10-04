import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { puckConfig } from '../config'
import { buildPostShowcaseUrl } from '../post-showcase'

describe('PostShowcase Puck contract', () => {
  it('builds an encoded preview URL', () => {
    expect(buildPostShowcaseUrl({
      postType: 'animal',
      limit: 6,
      category: 'cães e gatos',
    })).toBe('/api/posts/showcase?type=animal&limit=6&category=c%C3%A3es+e+gatos')
  })

  it('registers PostShowcase with the configured fields and stable defaults', () => {
    const component = puckConfig.components.PostShowcase as {
      fields: Record<string, unknown>
      defaultProps: Record<string, unknown>
    }

    expect(component.fields).toEqual(expect.objectContaining({
      postType: expect.any(Object),
      limit: expect.any(Object),
      category: expect.any(Object),
      layout: expect.any(Object),
      showExcerpt: expect.any(Object),
      showDate: expect.any(Object),
    }))
    expect(component.defaultProps).toEqual({
      postType: 'post',
      limit: 6,
      category: '',
      layout: 'grid',
      showExcerpt: true,
      showDate: true,
    })
  })

  it('keeps showcase images lazy-loaded', () => {
    const component = puckConfig.components.PostShowcase as { render: (props: any) => any }
    const markup = renderToStaticMarkup(React.createElement(component.render, {
      postType: 'post',
      limit: 1,
      category: '',
      layout: 'grid',
      showExcerpt: true,
      showDate: true,
      items: [{
        id: 1,
        title: 'Post',
        slug: 'post',
        excerpt: '',
        date: '2026-09-26T00:00:00.000Z',
        thumbnailUrl: 'https://cdn.example.test/photo.jpg',
      }],
    }))

    expect(markup).toContain('loading="lazy"')
    expect(markup).toContain('decoding="async"')
  })

  it('sanitizes showcase item links and thumbnails', () => {
    const component = puckConfig.components.PostShowcase as { render: (props: any) => any }
    const markup = renderToStaticMarkup(React.createElement(component.render, {
      postType: 'post',
      limit: 1,
      category: '',
      layout: 'grid',
      showExcerpt: true,
      showDate: false,
      items: [{
        id: 1,
        title: 'Post',
        slug: '//external.example.test',
        excerpt: '',
        date: '2026-09-26T00:00:00.000Z',
        thumbnailUrl: 'javascript:alert(1)',
      }],
    }))

    expect(markup).toContain('href="/external.example.test"')
    expect(markup).not.toContain('javascript:')
    expect(markup).not.toContain('<img')
  })
})
