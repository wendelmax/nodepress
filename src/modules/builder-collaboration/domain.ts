export type BuilderTargetType = 'post' | 'option' | 'tokens'

export type BuilderPermission =
  | 'builder.content.read'
  | 'builder.content.write'
  | 'builder.layout.read'
  | 'builder.layout.write'
  | 'builder.tokens.read'
  | 'builder.tokens.write'
  | 'builder.history.read'
  | 'builder.history.restore'
  | 'builder.comments.read'
  | 'builder.comments.write'
  | 'builder.client.use'

export type BuilderEditMode = 'editor' | 'client'

export interface BuilderActor {
  id: string
  role?: string
}

export interface BuilderTargetRef {
  type: BuilderTargetType
  key: string
  ownerId?: string
  status?: string
}

export interface BuilderDocumentLike {
  version: number
  content: unknown[]
  root: Record<string, unknown>
  metadata: Record<string, unknown>
}

export type BuilderChangeResult =
  | { ok: true }
  | { ok: false; code: string; reason: string }
