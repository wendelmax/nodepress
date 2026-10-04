import type { BuilderDocument } from '../types'

export const BREAKPOINTS = ['desktop', 'tablet', 'mobile'] as const
export type Breakpoint = (typeof BREAKPOINTS)[number]

export type Responsive<T> = {
  desktop: T
  tablet?: T
  mobile?: T
}

export type ResponsiveInput<T> = T | Responsive<T>
export type LayoutTag = 'section' | 'div' | 'main' | 'article' | 'aside'
export type LayoutAlign = 'left' | 'center' | 'right'
export type LayoutVerticalAlign = 'start' | 'center' | 'end' | 'stretch'
export type LayoutDirection = 'row' | 'column'
export type MaxWidthToken = 'full' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'screen'
export type LayoutBorder = 'none' | 'subtle' | 'strong'
export type LayoutComponentType = 'Section' | 'Container' | 'Columns' | 'Stack'

export type LayoutVisibility = ResponsiveInput<boolean>

export type SectionProps = {
  content: unknown[]
  as: LayoutTag
  ariaLabel?: string
  padding: ResponsiveInput<number>
  background: string
  overlay: string
  border: LayoutBorder
  radius: ResponsiveInput<number>
  visibility: LayoutVisibility
}

export type ContainerProps = {
  content: unknown[]
  as: LayoutTag
  ariaLabel?: string
  maxWidth: ResponsiveInput<MaxWidthToken>
  align: ResponsiveInput<LayoutAlign>
  padding: ResponsiveInput<number>
  visibility: LayoutVisibility
}

export type ColumnsProps = {
  column1?: unknown[]
  column2?: unknown[]
  column3?: unknown[]
  column4?: unknown[]
  columns: ResponsiveInput<2 | 3 | 4>
  gap: ResponsiveInput<number>
  align: ResponsiveInput<LayoutVerticalAlign>
  stackOnMobile: boolean
  visibility: LayoutVisibility
}

export type StackProps = {
  content: unknown[]
  as: LayoutTag
  ariaLabel?: string
  direction: ResponsiveInput<LayoutDirection>
  gap: ResponsiveInput<number>
  align: ResponsiveInput<LayoutAlign>
  justify: ResponsiveInput<LayoutVerticalAlign>
  wrap: ResponsiveInput<boolean>
  visibility: LayoutVisibility
}

export type LayoutProps = SectionProps | ContainerProps | ColumnsProps | StackProps

export type LayoutValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] }

export type LayoutDocumentValidation =
  | { valid: true }
  | { valid: false; errors: string[] }

export const LAYOUT_COMPONENT_TYPES: readonly LayoutComponentType[] = [
  'Section',
  'Container',
  'Columns',
  'Stack',
]

export const LAYOUT_COLOR_TOKENS = [
  'transparent',
  'surface',
  'surface-elevated',
  'primary',
  'primary-light',
  'border',
] as const

const MAX_WIDTH_TOKENS: readonly MaxWidthToken[] = ['full', 'sm', 'md', 'lg', 'xl', '2xl', 'screen']
const LAYOUT_TAGS: readonly LayoutTag[] = ['section', 'div', 'main', 'article', 'aside']
const ALIGNMENTS: readonly LayoutAlign[] = ['left', 'center', 'right']
const VERTICAL_ALIGNMENTS: readonly LayoutVerticalAlign[] = ['start', 'center', 'end', 'stretch']
const DIRECTIONS: readonly LayoutDirection[] = ['row', 'column']
const BORDERS: readonly LayoutBorder[] = ['none', 'subtle', 'strong']
const MAX_SPACING = 256
const MAX_GAP = 128

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasBreakpointKey(value: Record<string, unknown>): boolean {
  return BREAKPOINTS.some((breakpoint) => breakpoint in value)
}

export function normalizeResponsive<T>(value: ResponsiveInput<T>): Responsive<T> {
  if (!isRecord(value) || !hasBreakpointKey(value)) {
    return { desktop: value as T, tablet: value as T, mobile: value as T }
  }

  const desktop = value.desktop as T
  return {
    desktop,
    tablet: value.tablet === undefined ? desktop : value.tablet as T,
    mobile: value.mobile === undefined ? desktop : value.mobile as T,
  }
}

function pushUnknownKeys(value: Record<string, unknown>, allowed: readonly string[], path: string, errors: string[]) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${path}.${key} is not allowed`)
  }
}

function validateResponsive<T>(
  value: unknown,
  path: string,
  validate: (candidate: unknown) => boolean,
  errors: string[],
) {
  if (isRecord(value) && hasBreakpointKey(value)) {
    pushUnknownKeys(value, BREAKPOINTS, path, errors)
    if (!('desktop' in value)) errors.push(`${path}.desktop is required`)

    for (const breakpoint of BREAKPOINTS) {
      if (breakpoint in value && !validate(value[breakpoint])) {
        errors.push(`${path}.${breakpoint} is invalid`)
      }
    }
    return
  }

  if (!validate(value)) errors.push(`${path} is invalid`)
}

function isBoundedInteger(value: unknown, maximum: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= maximum
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isOneOf<T extends string | number>(values: readonly T[], value: unknown): value is T {
  return values.includes(value as T)
}

function isSafeColor(value: unknown): value is string {
  return typeof value === 'string'
    && (LAYOUT_COLOR_TOKENS.includes(value as (typeof LAYOUT_COLOR_TOKENS)[number]) || /^#[0-9a-fA-F]{3,8}$/.test(value))
}

function isSlot(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

function validateCommonProps(
  props: Record<string, unknown>,
  allowed: readonly string[],
  errors: string[],
) {
  pushUnknownKeys(props, allowed, 'props', errors)

  if ('as' in props && !isOneOf(LAYOUT_TAGS, props.as)) {
    errors.push('as is invalid')
  }
  if ('ariaLabel' in props && typeof props.ariaLabel !== 'string') {
    errors.push('ariaLabel is invalid')
  }
  if ('visibility' in props) {
    validateResponsive(props.visibility, 'visibility', isBoolean, errors)
  }
}

export function validateLayoutProps(type: string, value: unknown): LayoutValidationResult {
  if (!LAYOUT_COMPONENT_TYPES.includes(type as LayoutComponentType)) return { valid: true }
  if (!isRecord(value)) return { valid: false, errors: ['props must be an object'] }

  const errors: string[] = []

  if (type === 'Section') {
    validateCommonProps(value, ['content', 'as', 'ariaLabel', 'padding', 'background', 'overlay', 'border', 'radius', 'visibility'], errors)
    if (!isSlot(value.content)) errors.push('content is invalid')
    validateResponsive(value.padding, 'padding', (candidate) => isBoundedInteger(candidate, MAX_SPACING), errors)
    if (!isSafeColor(value.background)) errors.push('background is invalid')
    if (!isSafeColor(value.overlay)) errors.push('overlay is invalid')
    if (!isOneOf(BORDERS, value.border)) errors.push('border is invalid')
    validateResponsive(value.radius, 'radius', (candidate) => isBoundedInteger(candidate, MAX_SPACING), errors)
  }

  if (type === 'Container') {
    validateCommonProps(value, ['content', 'as', 'ariaLabel', 'maxWidth', 'align', 'padding', 'visibility'], errors)
    if (!isSlot(value.content)) errors.push('content is invalid')
    validateResponsive(value.maxWidth, 'maxWidth', (candidate) => isOneOf(MAX_WIDTH_TOKENS, candidate), errors)
    validateResponsive(value.align, 'align', (candidate) => isOneOf(ALIGNMENTS, candidate), errors)
    validateResponsive(value.padding, 'padding', (candidate) => isBoundedInteger(candidate, MAX_SPACING), errors)
  }

  if (type === 'Columns') {
    validateCommonProps(value, ['column1', 'column2', 'column3', 'column4', 'columns', 'gap', 'align', 'stackOnMobile', 'visibility'], errors)
    for (const slot of ['column1', 'column2', 'column3', 'column4']) {
      if (slot in value && !isSlot(value[slot])) errors.push(`${slot} is invalid`)
    }
    validateResponsive(value.columns, 'columns', (candidate) => isOneOf([2, 3, 4], candidate), errors)
    validateResponsive(value.gap, 'gap', (candidate) => isBoundedInteger(candidate, MAX_GAP), errors)
    validateResponsive(value.align, 'align', (candidate) => isOneOf(VERTICAL_ALIGNMENTS, candidate), errors)
    if (!isBoolean(value.stackOnMobile)) errors.push('stackOnMobile is invalid')
  }

  if (type === 'Stack') {
    validateCommonProps(value, ['content', 'as', 'ariaLabel', 'direction', 'gap', 'align', 'justify', 'wrap', 'visibility'], errors)
    if (!isSlot(value.content)) errors.push('content is invalid')
    validateResponsive(value.direction, 'direction', (candidate) => isOneOf(DIRECTIONS, candidate), errors)
    validateResponsive(value.gap, 'gap', (candidate) => isBoundedInteger(candidate, MAX_GAP), errors)
    validateResponsive(value.align, 'align', (candidate) => isOneOf(ALIGNMENTS, candidate), errors)
    validateResponsive(value.justify, 'justify', (candidate) => isOneOf(VERTICAL_ALIGNMENTS, candidate), errors)
    validateResponsive(value.wrap, 'wrap', isBoolean, errors)
  }

  return errors.length === 0 ? { valid: true } : { valid: false, errors }
}

function walkLayoutNodes(value: unknown, path: string, errors: string[]) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkLayoutNodes(item, `${path}[${index}]`, errors))
    return
  }
  if (!isRecord(value)) return

  if (typeof value.type === 'string' && isRecord(value.props)) {
    const validation = validateLayoutProps(value.type, value.props)
    if (!validation.valid) {
      errors.push(...validation.errors.map((error) => `${path}.props.${error}`))
    }
  }

  for (const [key, child] of Object.entries(value)) {
    walkLayoutNodes(child, path ? `${path}.${key}` : key, errors)
  }
}

export function validateBuilderLayoutDocument(document: BuilderDocument): LayoutDocumentValidation {
  const errors: string[] = []
  walkLayoutNodes(document.content, 'content', errors)
  walkLayoutNodes(document.root, 'root', errors)
  return errors.length === 0 ? { valid: true } : { valid: false, errors }
}
