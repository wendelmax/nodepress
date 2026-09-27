import {
  canPublishBuilderDocument,
  parseBuilderDocument,
  validateBuilderComponents,
} from './document'
import { validateBuilderLayoutDocument } from './layout/schema'

export function isBuilderPublishAllowed(
  initialData: unknown,
  componentIds: ReadonlySet<string>,
): boolean {
  if (initialData === null || initialData === undefined) return true
  if (typeof initialData === 'string' && initialData.trim() === '') return true
  if (!canPublishBuilderDocument(initialData)) return false

  const parsed = parseBuilderDocument(initialData)
  if (parsed.kind !== 'puck') return false

  return validateBuilderComponents(parsed.document, componentIds).valid
    && validateBuilderLayoutDocument(parsed.document).valid
}
