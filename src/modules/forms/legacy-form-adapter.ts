import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { validateFormDefinition } from './validation'
import type { FormDefinition, FormField } from './types'

export class LegacyFormMappingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LegacyFormMappingError'
  }
}

type LegacyPost = {
  id: number
  postName: string
  postTitle: string
  postContent: string
}

type FormDefinitionStore = {
  findUnique(args: { where: { id: string } }): Promise<FormDefinitionRow | null>
  create(args: { data: { id: string; slug: string; name: string; status: string; fields: Prisma.InputJsonValue } }): Promise<FormDefinitionRow>
  update(args: { where: { id: string }; data: { slug: string; name: string; status: string; fields: Prisma.InputJsonValue } }): Promise<FormDefinitionRow>
}

type FormDefinitionRow = {
  id: string
  slug: string
  name: string
  status: string
  fields: Prisma.JsonValue
  createdAt: Date
  updatedAt: Date
}

const legacyTypeMap: Record<string, FormField['type'] | undefined> = {
  text: 'text',
  email: 'email',
  number: 'number',
  textarea: 'textarea',
  checkbox: 'boolean',
  boolean: 'boolean',
}

export function parseLegacyFormFields(content: string): FormField[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new LegacyFormMappingError('Legacy form content is not valid JSON')
  }

  if (!Array.isArray(parsed)) throw new LegacyFormMappingError('Legacy form content must be an array of fields')

  const fields = parsed.map((value, index) => {
    if (!isRecord(value)) throw new LegacyFormMappingError(`Legacy form field ${index + 1} must be an object`)

    const name = typeof value.name === 'string' ? value.name.trim() : ''
    const label = typeof value.label === 'string' ? value.label.trim() : ''
    const type = typeof value.type === 'string' ? legacyTypeMap[value.type] : undefined
    if (!name) throw new LegacyFormMappingError(`Legacy form field ${index + 1} requires a field name`)
    if (!label) throw new LegacyFormMappingError(`Legacy form field ${name} requires a label`)
    if (!type) throw new LegacyFormMappingError(`Legacy form field ${name} has unsupported type`)

    return {
      name,
      label,
      type,
      ...(value.required === true ? { required: true } : {}),
    } as FormField
  })

  try {
    validateFormDefinition(fields)
  } catch (error) {
    throw new LegacyFormMappingError(error instanceof Error ? error.message : 'Legacy form fields are invalid')
  }
  return fields
}

export async function ensureLegacyFormDefinition(
  post: LegacyPost,
  store: FormDefinitionStore = prisma.formDefinition,
): Promise<FormDefinition> {
  const id = `legacy-${post.id}`
  const slug = `legacy-${post.id}-${normalizeSlug(post.postName || post.postTitle)}`.slice(0, 120)
  const fields = parseLegacyFormFields(post.postContent)
  const data = {
    id,
    slug,
    name: post.postTitle.trim() || `Legacy form ${post.id}`,
    status: 'active',
    fields: fields as unknown as Prisma.InputJsonValue,
  }
  const existing = await store.findUnique({ where: { id } })
  const row = existing
    ? await store.update({ where: { id }, data: { slug: data.slug, name: data.name, status: data.status, fields: data.fields } })
    : await store.create({ data })
  return toFormDefinition(row)
}

function toFormDefinition(row: FormDefinitionRow): FormDefinition {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status as FormDefinition['status'],
    fields: row.fields as unknown as FormField[],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'form'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
