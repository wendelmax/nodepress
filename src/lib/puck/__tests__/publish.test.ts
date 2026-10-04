import { describe, expect, it } from 'vitest'
import { isBuilderPublishAllowed } from '../publish'

const validSection = {
  type: 'Section',
  props: {
    content: [],
    as: 'section',
    padding: { desktop: 16 },
    background: 'surface',
    overlay: 'transparent',
    border: 'none',
    radius: { desktop: 0 },
    visibility: { desktop: true },
  },
}

describe('builder publish gate', () => {
  it('allows valid Puck data and empty documents', () => {
    expect(isBuilderPublishAllowed({ root: {}, content: [validSection] }, new Set(['Section']))).toBe(true)
    expect(isBuilderPublishAllowed('', new Set())).toBe(true)
  })

  it('rejects invalid layout props and incompatible legacy content', () => {
    expect(isBuilderPublishAllowed({
      root: {},
      content: [{
        ...validSection,
        props: { ...validSection.props, padding: { desktop: 999 } },
      }],
    }, new Set(['Section']))).toBe(false)
    expect(isBuilderPublishAllowed('<p>legacy</p>', new Set())).toBe(false)
    expect(isBuilderPublishAllowed({ blocks: [] }, new Set())).toBe(false)
  })
})
