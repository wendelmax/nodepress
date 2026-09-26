import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { layoutComponents } from '../components'

const slot = (label: string) => Object.assign(
  () => React.createElement('p', null, label),
  { displayName: `LayoutTestSlot-${label}` },
)

describe('builder layout components', () => {
  it('exposes the four semantic components with native Puck slots', () => {
    expect(Object.keys(layoutComponents)).toEqual(['Section', 'Container', 'Columns', 'Stack'])
    expect(layoutComponents.Section.fields.content).toMatchObject({ type: 'slot' })
    expect(layoutComponents.Container.fields.content).toMatchObject({ type: 'slot' })
    expect(layoutComponents.Stack.fields.content).toMatchObject({ type: 'slot' })
    expect(layoutComponents.Columns.fields.column1).toMatchObject({ type: 'slot' })
    expect(layoutComponents.Columns.fields.column4).toMatchObject({ type: 'slot' })
  })

  it('renders semantic tags, scoped attributes and aria-label only when supplied', () => {
    const markup = renderToStaticMarkup(layoutComponents.Section.render({
      ...layoutComponents.Section.defaultProps,
      content: slot('section content'),
      as: 'article',
      ariaLabel: 'Featured content',
    }))

    expect(markup).toContain('<article')
    expect(markup).toContain('data-nodepress-layout="section"')
    expect(markup).toContain('aria-label="Featured content"')
    expect(markup).toContain('section content')

    const withoutLabel = renderToStaticMarkup(layoutComponents.Container.render({
      ...layoutComponents.Container.defaultProps,
      content: slot('container content'),
      ariaLabel: '',
    }))
    expect(withoutLabel).not.toContain('aria-label=')
  })

  it('renders only the configured number of columns and stacks on mobile when requested', () => {
    const markup = renderToStaticMarkup(layoutComponents.Columns.render({
      ...layoutComponents.Columns.defaultProps,
      columns: { desktop: 2 },
      stackOnMobile: true,
      column1: slot('one'),
      column2: slot('two'),
      column3: slot('three'),
      column4: slot('four'),
    }))

    expect(markup).toContain('one')
    expect(markup).toContain('two')
    expect(markup).not.toContain('three')
    expect(markup).not.toContain('four')
    expect(markup).toContain('data-nodepress-layout="columns"')
    expect(markup).toContain('--nodepress-layout-columns-mobile:1')
  })

  it('renders Stack direction, gap and wrapping through scoped variables', () => {
    const markup = renderToStaticMarkup(layoutComponents.Stack.render({
      ...layoutComponents.Stack.defaultProps,
      content: slot('stack content'),
      direction: { desktop: 'row', mobile: 'column' },
      gap: { desktop: 24, mobile: 8 },
      wrap: { desktop: true },
    }))

    expect(markup).toContain('data-nodepress-layout="stack"')
    expect(markup).toContain('--nodepress-layout-direction-desktop:row')
    expect(markup).toContain('--nodepress-layout-direction-mobile:column')
    expect(markup).toContain('stack content')
  })
})
