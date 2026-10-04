import React from 'react'
import type { ComponentConfig, SlotComponent } from '@measured/puck'
import type {
  ColumnsProps,
  ContainerProps,
  LayoutAlign,
  LayoutComponentType,
  LayoutDirection,
  LayoutTag,
  LayoutVerticalAlign,
  SectionProps,
  StackProps,
} from './schema'
import { layoutDataAttributes, layoutStyleVariables } from './styles'

type RenderSlot = SlotComponent | undefined

type SectionRenderProps = Omit<SectionProps, 'content'> & { content?: RenderSlot }
type ContainerRenderProps = Omit<ContainerProps, 'content'> & { content?: RenderSlot }
type ColumnsRenderProps = Omit<ColumnsProps, 'column1' | 'column2' | 'column3' | 'column4'> & {
  column1?: RenderSlot
  column2?: RenderSlot
  column3?: RenderSlot
  column4?: RenderSlot
}
type StackRenderProps = Omit<StackProps, 'content'> & { content?: RenderSlot }

const TAG_OPTIONS = [
  { label: 'Section', value: 'section' },
  { label: 'Div', value: 'div' },
  { label: 'Main', value: 'main' },
  { label: 'Article', value: 'article' },
  { label: 'Aside', value: 'aside' },
]

const ALIGN_OPTIONS = [
  { label: 'Left', value: 'left' },
  { label: 'Center', value: 'center' },
  { label: 'Right', value: 'right' },
]

const VERTICAL_ALIGN_OPTIONS = [
  { label: 'Start', value: 'start' },
  { label: 'Center', value: 'center' },
  { label: 'End', value: 'end' },
  { label: 'Stretch', value: 'stretch' },
]

const DIRECTION_OPTIONS = [
  { label: 'Row', value: 'row' },
  { label: 'Column', value: 'column' },
]

function responsiveNumberField(label: string, maximum: number) {
  return {
    type: 'object',
    label,
    objectFields: {
      desktop: { type: 'number', min: 0, max: maximum },
      tablet: { type: 'number', min: 0, max: maximum },
      mobile: { type: 'number', min: 0, max: maximum },
    },
  }
}

function responsiveSelectField(label: string, options: Array<{ label: string; value: string | number | boolean }>) {
  return {
    type: 'object',
    label,
    objectFields: {
      desktop: { type: 'select', options },
      tablet: { type: 'select', options },
      mobile: { type: 'select', options },
    },
  }
}

const visibilityField = responsiveSelectField('Visibility', [
  { label: 'Visible', value: true },
  { label: 'Hidden', value: false },
])

const wrapField = responsiveSelectField('Wrap', [
  { label: 'Wrap', value: true },
  { label: 'No wrap', value: false },
])

const commonFields = {
  as: { type: 'select', label: 'HTML element', options: TAG_OPTIONS },
  ariaLabel: { type: 'text', label: 'ARIA label' },
}

function renderSlot(slot: RenderSlot) {
  return typeof slot === 'function' ? slot() : null
}

function semanticTag(value: unknown, fallback: LayoutTag): LayoutTag {
  return typeof value === 'string' && TAG_OPTIONS.some((option) => option.value === value)
    ? value as LayoutTag
    : fallback
}

function ariaProps(value: unknown): { 'aria-label'?: string } {
  return typeof value === 'string' && value.trim() ? { 'aria-label': value.trim() } : {}
}

function layoutStyle(variables: Record<string, string>): React.CSSProperties {
  return variables as React.CSSProperties
}

function sectionRender(input: unknown) {
  const props = input as SectionRenderProps
  const Tag = semanticTag(props.as, 'section')
  return React.createElement(
    Tag,
    {
      ...layoutDataAttributes('Section'),
      ...ariaProps(props.ariaLabel),
      style: layoutStyle(layoutStyleVariables({
        padding: props.padding,
        background: props.background,
        overlay: props.overlay,
        border: props.border,
        radius: props.radius,
        visibility: props.visibility,
      })),
    },
    renderSlot(props.content),
  )
}

function containerRender(input: unknown) {
  const props = input as ContainerRenderProps
  const Tag = semanticTag(props.as, 'div')
  return React.createElement(
    Tag,
    {
      ...layoutDataAttributes('Container'),
      ...ariaProps(props.ariaLabel),
      style: layoutStyle(layoutStyleVariables({
        maxWidth: props.maxWidth,
        align: props.align,
        padding: props.padding,
        visibility: props.visibility,
      })),
    },
    renderSlot(props.content),
  )
}

function columnsRender(input: unknown) {
  const props = input as ColumnsRenderProps
  const columns = [props.column1, props.column2, props.column3, props.column4]
  const configuredColumns = [props.columns].flatMap((value) => {
    if (typeof value === 'number') return [value]
    return [value.desktop, value.tablet, value.mobile].filter((item): item is 2 | 3 | 4 => item === 2 || item === 3 || item === 4)
  })
  const activeColumns = Math.max(...configuredColumns, 2)

  return React.createElement(
    'div',
    {
      ...layoutDataAttributes('Columns'),
      style: layoutStyle(layoutStyleVariables({
        columns: props.columns,
        gap: props.gap,
        align: props.align,
        visibility: props.visibility,
        displayMode: 'grid',
        stackOnMobile: props.stackOnMobile,
      })),
    },
    columns.slice(0, activeColumns).map((column, index) => React.createElement(
      'div',
      { key: `column-${index}`, 'data-nodepress-layout-column': String(index + 1) },
      renderSlot(column),
    )),
  )
}

function stackRender(input: unknown) {
  const props = input as StackRenderProps
  const Tag = semanticTag(props.as, 'div')
  return React.createElement(
    Tag,
    {
      ...layoutDataAttributes('Stack'),
      ...ariaProps(props.ariaLabel),
      style: layoutStyle(layoutStyleVariables({
        direction: props.direction,
        gap: props.gap,
        align: props.align,
        justify: props.justify,
        wrap: props.wrap,
        visibility: props.visibility,
        displayMode: 'flex',
      })),
    },
    renderSlot(props.content),
  )
}

const commonDefaults = {
  as: 'div' as LayoutTag,
  ariaLabel: '',
  visibility: { desktop: true },
}

export const layoutComponents = {
  Section: {
    fields: {
      ...commonFields,
      content: { type: 'slot' },
      padding: responsiveNumberField('Padding', 256),
      background: { type: 'text', label: 'Background' },
      overlay: { type: 'text', label: 'Overlay' },
      border: { type: 'select', label: 'Border', options: [{ label: 'None', value: 'none' }, { label: 'Subtle', value: 'subtle' }, { label: 'Strong', value: 'strong' }] },
      radius: responsiveNumberField('Radius', 256),
      visibility: visibilityField,
    },
    defaultProps: {
      ...commonDefaults,
      as: 'section',
      content: [],
      padding: { desktop: 64, tablet: 48, mobile: 32 },
      background: 'transparent',
      overlay: 'transparent',
      border: 'none',
      radius: { desktop: 0 },
    },
    render: sectionRender,
  } satisfies ComponentConfig<any>,
  Container: {
    fields: {
      ...commonFields,
      content: { type: 'slot' },
      maxWidth: responsiveSelectField('Max width', [{ label: 'Full', value: 'full' }, { label: 'Small', value: 'sm' }, { label: 'Medium', value: 'md' }, { label: 'Large', value: 'lg' }, { label: 'XL', value: 'xl' }, { label: '2XL', value: '2xl' }, { label: 'Screen', value: 'screen' }]),
      align: responsiveSelectField('Alignment', ALIGN_OPTIONS),
      padding: responsiveNumberField('Horizontal padding', 256),
      visibility: visibilityField,
    },
    defaultProps: {
      ...commonDefaults,
      content: [],
      maxWidth: { desktop: 'lg' },
      align: { desktop: 'center' },
      padding: { desktop: 24, tablet: 20, mobile: 16 },
    },
    render: containerRender,
  } satisfies ComponentConfig<any>,
  Columns: {
    fields: {
      column1: { type: 'slot' },
      column2: { type: 'slot' },
      column3: { type: 'slot' },
      column4: { type: 'slot' },
      columns: responsiveSelectField('Columns', [{ label: '2', value: 2 }, { label: '3', value: 3 }, { label: '4', value: 4 }]),
      gap: responsiveNumberField('Gap', 128),
      align: responsiveSelectField('Vertical alignment', VERTICAL_ALIGN_OPTIONS),
      stackOnMobile: { type: 'radio', label: 'Stack on mobile', options: [{ label: 'Yes', value: true }, { label: 'No', value: false }] },
      visibility: visibilityField,
    },
    defaultProps: {
      column1: [],
      column2: [],
      column3: [],
      column4: [],
      columns: { desktop: 2 },
      gap: { desktop: 24, tablet: 20, mobile: 16 },
      align: { desktop: 'stretch' },
      stackOnMobile: true,
      visibility: { desktop: true },
    },
    render: columnsRender,
  } satisfies ComponentConfig<any>,
  Stack: {
    fields: {
      ...commonFields,
      content: { type: 'slot' },
      direction: responsiveSelectField('Direction', DIRECTION_OPTIONS),
      gap: responsiveNumberField('Gap', 128),
      align: responsiveSelectField('Alignment', ALIGN_OPTIONS),
      justify: responsiveSelectField('Justify', VERTICAL_ALIGN_OPTIONS),
      wrap: wrapField,
      visibility: visibilityField,
    },
    defaultProps: {
      ...commonDefaults,
      content: [],
      direction: { desktop: 'column' } as ResponsiveValue<LayoutDirection>,
      gap: { desktop: 16 },
      align: { desktop: 'left' },
      justify: { desktop: 'start' },
      wrap: { desktop: false },
    },
    render: stackRender,
  } satisfies ComponentConfig<any>,
} as const

type ResponsiveValue<T> = { desktop: T; tablet?: T; mobile?: T }

export type LayoutComponents = typeof layoutComponents
