import type {
  LayoutAlign,
  LayoutBorder,
  LayoutComponentType,
  LayoutDirection,
  LayoutVerticalAlign,
  MaxWidthToken,
  ResponsiveInput,
} from './schema'
import { normalizeResponsive } from './schema'

export type LayoutStyleInput = {
  padding?: ResponsiveInput<number>
  gap?: ResponsiveInput<number>
  maxWidth?: ResponsiveInput<MaxWidthToken>
  visibility?: ResponsiveInput<boolean>
  background?: string
  overlay?: string
  border?: LayoutBorder
  radius?: ResponsiveInput<number>
  align?: ResponsiveInput<LayoutAlign | LayoutVerticalAlign>
  direction?: ResponsiveInput<LayoutDirection>
  justify?: ResponsiveInput<LayoutVerticalAlign>
  wrap?: ResponsiveInput<boolean>
  columns?: ResponsiveInput<2 | 3 | 4>
  stackOnMobile?: boolean
}

export type LayoutStyleVariables = Record<string, string>

const MAX_WIDTH_VALUES: Record<MaxWidthToken, string> = {
  full: '100%',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  screen: '100vw',
}

const BORDER_VALUES: Record<LayoutBorder, string> = {
  none: 'none',
  subtle: '1px solid var(--nodepress-layout-border-color, rgba(255,255,255,0.12))',
  strong: '2px solid var(--nodepress-layout-border-color, rgba(255,255,255,0.24))',
}

function setResponsive(
  variables: LayoutStyleVariables,
  name: string,
  value: ResponsiveInput<unknown> | undefined,
  format: (candidate: unknown) => string,
) {
  if (value === undefined) return
  const normalized = normalizeResponsive(value)
  variables[`--nodepress-layout-${name}-desktop`] = format(normalized.desktop)
  variables[`--nodepress-layout-${name}-tablet`] = format(normalized.tablet)
  variables[`--nodepress-layout-${name}-mobile`] = format(normalized.mobile)
}

function formatAlign(value: unknown): string {
  if (value === 'left' || value === 'start') return 'flex-start'
  if (value === 'right' || value === 'end') return 'flex-end'
  return String(value)
}

export function layoutStyleVariables(input: LayoutStyleInput): LayoutStyleVariables {
  const variables: LayoutStyleVariables = {}

  setResponsive(variables, 'padding', input.padding, (value) => `${String(value)}px`)
  setResponsive(variables, 'gap', input.gap, (value) => `${String(value)}px`)
  setResponsive(variables, 'max-width', input.maxWidth, (value) => MAX_WIDTH_VALUES[value as MaxWidthToken])
  setResponsive(variables, 'display', input.visibility, (value) => value ? 'block' : 'none')
  setResponsive(variables, 'radius', input.radius, (value) => `${String(value)}px`)
  setResponsive(variables, 'align', input.align, formatAlign)
  setResponsive(variables, 'direction', input.direction, (value) => String(value))
  setResponsive(variables, 'justify', input.justify, formatAlign)
  setResponsive(variables, 'wrap', input.wrap, (value) => value ? 'wrap' : 'nowrap')
  setResponsive(variables, 'columns', input.columns, (value) => String(value))

  if (input.stackOnMobile !== undefined) {
    variables['--nodepress-layout-stack-on-mobile'] = input.stackOnMobile ? '1' : '0'
    if (input.stackOnMobile) variables['--nodepress-layout-columns-mobile'] = '1'
  }
  if (input.background !== undefined) variables['--nodepress-layout-background'] = input.background
  if (input.overlay !== undefined) variables['--nodepress-layout-overlay'] = input.overlay
  if (input.border !== undefined) variables['--nodepress-layout-border'] = BORDER_VALUES[input.border]

  return variables
}

export function layoutDataAttributes(type: LayoutComponentType): Record<string, string> {
  return { 'data-nodepress-layout': type.toLowerCase() }
}
