import type {
  NodePressTheme,
  ThemeArchiveTemplate,
  ThemeSingleTemplate,
} from './types'
import { isSafeTemplateIdentifier } from '@/lib/themes/templates'

export { isSafeTemplateIdentifier } from '@/lib/themes/templates'

function isTemplateComponent(value: unknown): value is (...args: never[]) => unknown {
  return typeof value === 'function'
}

export function resolveSingleTemplate(
  theme: NodePressTheme,
  postType?: unknown,
): ThemeSingleTemplate {
  if (isSafeTemplateIdentifier(postType)) {
    const candidate = theme[`Single_${postType}`]
    if (isTemplateComponent(candidate)) return candidate as ThemeSingleTemplate
  }

  return theme.SinglePost
}

export function resolveArchiveTemplate(
  theme: NodePressTheme,
  postType?: unknown,
): ThemeArchiveTemplate {
  if (isSafeTemplateIdentifier(postType)) {
    const candidate = theme[`Archive_${postType}`]
    if (isTemplateComponent(candidate)) return candidate as ThemeArchiveTemplate
  }

  return theme.Archive
}
