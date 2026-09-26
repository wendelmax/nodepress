import { describe, expect, it } from 'vitest'
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
})
