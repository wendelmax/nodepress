import { describe, expect, it } from 'vitest'
import {
  layoutDataAttributes,
  layoutStyleVariables,
} from '../styles'

describe('responsive layout styles', () => {
  it('creates scoped variables for breakpoint values and inherits missing values', () => {
    expect(layoutStyleVariables({
      padding: { desktop: 24, mobile: 8 },
      gap: 16,
      maxWidth: { desktop: 'lg', tablet: 'md', mobile: 'sm' },
      visibility: { desktop: true, mobile: false },
    })).toMatchObject({
      '--nodepress-layout-padding-desktop': '24px',
      '--nodepress-layout-padding-tablet': '24px',
      '--nodepress-layout-padding-mobile': '8px',
      '--nodepress-layout-gap-desktop': '16px',
      '--nodepress-layout-gap-tablet': '16px',
      '--nodepress-layout-gap-mobile': '16px',
      '--nodepress-layout-max-width-desktop': '1024px',
      '--nodepress-layout-max-width-tablet': '768px',
      '--nodepress-layout-max-width-mobile': '640px',
      '--nodepress-layout-display-desktop': 'block',
      '--nodepress-layout-display-tablet': 'block',
      '--nodepress-layout-display-mobile': 'none',
    })
  })

  it('emits only fixed data attributes and does not derive selectors from input', () => {
    expect(layoutDataAttributes('Section')).toEqual({
      'data-nodepress-layout': 'section',
    })
    expect(layoutDataAttributes('Columns')).toEqual({
      'data-nodepress-layout': 'columns',
    })
  })
})
