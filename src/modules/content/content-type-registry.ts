const IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/

export type ContentFieldType = 'text' | 'number' | 'boolean' | 'date' | 'select' | 'relation' | 'media' | 'json'

export interface ContentFieldDefinition {
  type: ContentFieldType
  required?: boolean
  options?: readonly string[]
  targetType?: string
  multiple?: boolean
}

export interface ContentTypeDefinition {
  id: string
  label: string
  version: string
  fields: Readonly<Record<string, ContentFieldDefinition>>
}

export class ContentTypeRegistry {
  private readonly definitions = new Map<string, ContentTypeDefinition>()

  register(definition: ContentTypeDefinition): () => void {
    validateContentTypeDefinition(definition)
    if (this.definitions.has(definition.id)) {
      throw new Error(`Content type already registered: ${definition.id}`)
    }
    const immutable = freezeDefinition(definition)
    this.definitions.set(definition.id, immutable)
    let removed = false
    return () => {
      if (removed) return
      removed = true
      this.definitions.delete(definition.id)
    }
  }

  get(id: string): ContentTypeDefinition | undefined {
    return this.definitions.get(id)
  }

  list(): ContentTypeDefinition[] {
    return [...this.definitions.values()].sort((a, b) => a.id.localeCompare(b.id))
  }

  clear(): void {
    this.definitions.clear()
  }
}

export const contentTypeRegistry = new ContentTypeRegistry()

export function validateContentTypeDefinition(definition: ContentTypeDefinition): void {
  if (!IDENTIFIER_PATTERN.test(definition.id)) throw new Error(`Invalid content type id: ${definition.id}`)
  if (!definition.label?.trim()) throw new Error(`Invalid content type label: ${definition.id}`)
  if (!VERSION_PATTERN.test(definition.version)) throw new Error(`Invalid content type version: ${definition.id}`)
  for (const [fieldId, field] of Object.entries(definition.fields)) {
    if (!IDENTIFIER_PATTERN.test(fieldId)) throw new Error(`Invalid content field id: ${fieldId}`)
    if (!field || !['text', 'number', 'boolean', 'date', 'select', 'relation', 'media', 'json'].includes(field.type)) {
      throw new Error(`Invalid content field type: ${definition.id}.${fieldId}`)
    }
    if (field.type === 'select' && (!field.options || field.options.length === 0)) {
      throw new Error(`Select field requires options: ${definition.id}.${fieldId}`)
    }
    if (field.options && new Set(field.options).size !== field.options.length) {
      throw new Error(`Duplicate select option: ${definition.id}.${fieldId}`)
    }
  }
}

function freezeDefinition(definition: ContentTypeDefinition): ContentTypeDefinition {
  const fields = Object.fromEntries(Object.entries(definition.fields).map(([id, field]) => [
    id,
    Object.freeze({ ...field, options: field.options ? Object.freeze([...field.options]) : undefined }),
  ]))
  return Object.freeze({ ...definition, fields: Object.freeze(fields) })
}
