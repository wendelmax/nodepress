import { readFileSync } from 'node:fs'
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

  it('maps container alignment to scoped horizontal margins', () => {
    expect(layoutStyleVariables({
      align: { desktop: 'left', tablet: 'center', mobile: 'right' },
    })).toMatchObject({
      '--nodepress-layout-margin-left-desktop': '0',
      '--nodepress-layout-margin-right-desktop': 'auto',
      '--nodepress-layout-margin-left-tablet': 'auto',
      '--nodepress-layout-margin-right-tablet': 'auto',
      '--nodepress-layout-margin-left-mobile': 'auto',
      '--nodepress-layout-margin-right-mobile': '0',
    })
  })

  it('keeps every layout rule scoped and does not target global page elements', () => {
    const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

    expect(css).toContain('[data-nodepress-layout]')
    expect(css).not.toMatch(/(^|\n)\s*(html|body|\*)\s*\{/)
    expect(css).not.toContain('dangerouslySetInnerHTML')
  })

  it('preserves component display modes while honoring responsive visibility', () => {
    expect(layoutStyleVariables({
      displayMode: 'grid',
      visibility: { desktop: false, mobile: true },
    })).toMatchObject({
      '--nodepress-layout-display-desktop': 'none',
      '--nodepress-layout-display-tablet': 'none',
      '--nodepress-layout-display-mobile': 'grid',
    })
  })
})
