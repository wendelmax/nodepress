import { normalizeRole } from '@/lib/role-normalization.mjs'
import type {
  BuilderActor,
  BuilderChangeResult,
  BuilderDocumentLike,
  BuilderEditMode,
  BuilderPermission,
  BuilderTargetRef,
} from './domain'

const ALL_PERMISSIONS: readonly BuilderPermission[] = [
  'builder.content.read',
  'builder.content.write',
  'builder.layout.read',
  'builder.layout.write',
  'builder.tokens.read',
  'builder.tokens.write',
  'builder.history.read',
  'builder.history.restore',
  'builder.comments.read',
  'builder.comments.write',
  'builder.client.use',
]

const ROLE_PERMISSIONS: Record<string, readonly BuilderPermission[]> = {
  admin: ALL_PERMISSIONS,
  editor: [
    'builder.content.read',
    'builder.content.write',
    'builder.layout.read',
    'builder.layout.write',
    'builder.tokens.read',
    'builder.history.read',
    'builder.history.restore',
    'builder.comments.read',
    'builder.comments.write',
  ],
  author: [
    'builder.content.read',
    'builder.content.write',
    'builder.history.read',
  ],
  contributor: [
    'builder.content.read',
    'builder.content.write',
    'builder.history.read',
  ],
  client: [
    'builder.content.read',
    'builder.content.write',
    'builder.client.use',
  ],
}

const CLIENT_EDITABLE_FIELDS: Readonly<Record<string, readonly string[]>> = {
  Hero: ['title', 'subtitle', 'align'],
  Heading: ['title', 'align'],
  Text: ['text', 'align'],
  Button: ['label', 'variant', 'align'],
  Image: ['alt', 'objectFit'],
  Spacer: [],
  Form: [],
  PostShowcase: [],
}

export function getBuilderPermissions(actor: BuilderActor): ReadonlySet<BuilderPermission> {
  return new Set(ROLE_PERMISSIONS[normalizeRole(actor.role)] ?? [])
}

function isOwnedPost(actor: BuilderActor, target: BuilderTargetRef): boolean {
  return target.type === 'post' && target.ownerId !== undefined && String(target.ownerId) === String(actor.id)
}

export function canBuilder(
  actor: BuilderActor,
  permission: BuilderPermission,
  target: BuilderTargetRef,
): boolean {
  const role = normalizeRole(actor.role)
  const permissions = getBuilderPermissions(actor)
  if (!permissions.has(permission)) return false

  if (role === 'author') return isOwnedPost(actor, target)
  if (role === 'contributor') {
    return isOwnedPost(actor, target) && (permission === 'builder.content.read'
      || permission === 'builder.content.write'
      || permission === 'builder.history.read') && target.status === 'draft'
  }
  if (role === 'client') return target.type === 'post' && permission.startsWith('builder.content.') || permission === 'builder.client.use'

  if (target.type === 'tokens') return permission.startsWith('builder.tokens.')
  return true
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value === null || typeof value !== 'object') return value

  return Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((result, key) => {
      result[key] = stableValue((value as Record<string, unknown>)[key])
      return result
    }, {})
}

function structureOf(document: BuilderDocumentLike): unknown {
  return {
    root: stableValue(document.root),
    content: document.content.map((entry) => {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return null
      const record = entry as Record<string, unknown>
      const props = record.props
      const childStructure = props && typeof props === 'object' && !Array.isArray(props)
        ? (props as Record<string, unknown>).children
        : undefined
      return {
        type: record.type ?? null,
        children: Array.isArray(childStructure)
          ? childStructure.map((child) => structureOf({
            version: document.version,
            root: {},
            content: [child],
            metadata: {},
          }))
          : undefined,
      }
    }),
  }
}

function changedPropKeys(previous: unknown, next: unknown): string[] {
  if (previous === null || next === null || typeof previous !== 'object' || typeof next !== 'object'
    || Array.isArray(previous) || Array.isArray(next)) return []

  const previousProps = (previous as Record<string, unknown>).props
  const nextProps = (next as Record<string, unknown>).props
  if (!previousProps || !nextProps || typeof previousProps !== 'object' || typeof nextProps !== 'object'
    || Array.isArray(previousProps) || Array.isArray(nextProps)) return []

  const keys = new Set([...Object.keys(previousProps), ...Object.keys(nextProps)])
  return [...keys].filter((key) => JSON.stringify(stableValue((previousProps as Record<string, unknown>)[key]))
    !== JSON.stringify(stableValue((nextProps as Record<string, unknown>)[key])))
}

export function getClientEditableFields(componentType: string): readonly string[] {
  return CLIENT_EDITABLE_FIELDS[componentType] ?? []
}

export function assertBuilderChange(
  previous: BuilderDocumentLike,
  next: BuilderDocumentLike,
  actor: BuilderActor,
  mode: BuilderEditMode = 'editor',
  target: BuilderTargetRef = { type: 'post', key: '' },
): BuilderChangeResult {
  if (!canBuilder(actor, 'builder.content.write', target)) {
    return { ok: false, code: 'builder_content_forbidden', reason: 'Content editing is not allowed for this target' }
  }

  if (mode === 'client' && !canBuilder(actor, 'builder.client.use', target)) {
    return { ok: false, code: 'builder_client_forbidden', reason: 'Client mode is not allowed for this actor' }
  }

  const changedStructure = JSON.stringify(structureOf(previous)) !== JSON.stringify(structureOf(next))
  if (changedStructure && !canBuilder(actor, 'builder.layout.write', target)) {
    return { ok: false, code: 'builder_layout_forbidden', reason: 'Layout changes require layout permission' }
  }

  if (mode === 'client') {
    if (changedStructure) {
      return { ok: false, code: 'builder_client_structure_forbidden', reason: 'Client mode cannot change Builder structure' }
    }

    for (let index = 0; index < previous.content.length; index += 1) {
      const before = previous.content[index] as Record<string, unknown>
      const after = next.content[index] as Record<string, unknown>
      const type = typeof before?.type === 'string' ? before.type : ''
      const editable = new Set(getClientEditableFields(type))
      if (changedPropKeys(before, after).some((key) => !editable.has(key))) {
        return { ok: false, code: 'builder_client_field_forbidden', reason: 'Client mode cannot edit this field' }
      }
    }
  }

  return { ok: true }
}
