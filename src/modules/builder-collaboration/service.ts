import { randomUUID } from 'node:crypto'
import {
  createEmptyBuilderDocument,
  parseBuilderDocument,
  serializeBuilderDocument,
} from '@/lib/puck/document'
import type { BuilderDocument } from '@/lib/puck/types'
import type {
  BuilderActor,
  BuilderDocumentLike,
  BuilderEditMode,
  BuilderPermission,
  BuilderTargetRef,
} from './domain'
import { assertBuilderChange, canBuilder, getBuilderPermissions } from './policy'
import {
  BuilderConflictError,
  BuilderForbiddenError,
  BuilderInvalidDocumentError,
  BuilderNotFoundError,
} from './errors'
import type {
  BuilderCommentRecord,
  BuilderRepository,
  BuilderRevisionRecord,
  BuilderSourceAdapter,
  BuilderTargetRecord,
} from './repository'

export interface BuilderServiceOptions {
  repository: BuilderRepository
  source: BuilderSourceAdapter
  resolveTarget?: (target: BuilderTargetRef) => Promise<BuilderTargetRef>
}

export interface BuilderTargetView {
  targetId: string
  target: BuilderTargetRef
  document: BuilderDocumentLike
  version: number
  capabilities: readonly BuilderPermission[]
}

export interface BuilderRevisionView extends BuilderRevisionRecord {}

export interface BuilderSaveInput {
  document: unknown
  expectedVersion: number
  note?: string
  mode?: BuilderEditMode
  requestId?: string
}

export interface BuilderMutationResult {
  targetId: string
  target: BuilderTargetRef
  document: BuilderDocumentLike
  version: number
  revision: BuilderRevisionRecord
}

export interface BuilderCommentInput {
  body: string
  anchor?: string
  revisionId?: string
}

function asDocument(value: unknown): BuilderDocument {
  const parsed = parseBuilderDocument(value)
  if (parsed.kind !== 'puck') {
    throw new BuilderInvalidDocumentError('Only a valid Puck document can be collaborated on')
  }
  return parsed.document
}

function asDocumentLike(value: BuilderDocument): BuilderDocumentLike {
  return value
}

function requiredReadPermission(target: BuilderTargetRef): BuilderPermission {
  return target.type === 'tokens' ? 'builder.tokens.read' : 'builder.content.read'
}

function requiredWritePermission(target: BuilderTargetRef): BuilderPermission {
  return target.type === 'tokens' ? 'builder.tokens.write' : 'builder.content.write'
}

function ensureExpectedVersion(version: number): void {
  if (!Number.isInteger(version) || version < 0) {
    throw new BuilderInvalidDocumentError('expectedVersion must be a non-negative integer')
  }
}

export class BuilderService {
  constructor(private readonly options: BuilderServiceOptions) {}

  private async context(target: BuilderTargetRef): Promise<BuilderTargetRef> {
    return this.options.resolveTarget ? this.options.resolveTarget(target) : target
  }

  private assertPermission(actor: BuilderActor, permission: BuilderPermission, target: BuilderTargetRef): void {
    if (!canBuilder(actor, permission, target)) {
      throw new BuilderForbiddenError(permission.replaceAll('.', '_'), `Missing ${permission}`)
    }
  }

  private async ensureTarget(target: BuilderTargetRef): Promise<BuilderTargetRecord> {
    const existing = await this.options.repository.getTarget(target)
    if (existing) return existing

    const raw = await this.options.source.read(target)
    const document = raw === null || raw.trim() === ''
      ? createEmptyBuilderDocument()
      : asDocument(raw)

    try {
      return await this.options.repository.createTarget({
        targetType: target.type,
        targetKey: target.key,
        document: asDocumentLike(document),
        version: 0,
      })
    } catch {
      const raced = await this.options.repository.getTarget(target)
      if (raced) return raced
      throw new BuilderNotFoundError('Unable to initialize Builder target')
    }
  }

  private view(actor: BuilderActor, target: BuilderTargetRef, record: BuilderTargetRecord): BuilderTargetView {
    return {
      targetId: record.id,
      target,
      document: record.document,
      version: record.version,
      capabilities: [...getBuilderPermissions(actor)],
    }
  }

  async getTarget(actor: BuilderActor, targetRef: BuilderTargetRef): Promise<BuilderTargetView> {
    const target = await this.context(targetRef)
    this.assertPermission(actor, requiredReadPermission(target), target)
    return this.view(actor, target, await this.ensureTarget(target))
  }

  async save(actor: BuilderActor, targetRef: BuilderTargetRef, input: BuilderSaveInput): Promise<BuilderMutationResult> {
    const target = await this.context(targetRef)
    this.assertPermission(actor, requiredWritePermission(target), target)
    ensureExpectedVersion(input.expectedVersion)
    const document = asDocument(input.document)
    const current = await this.ensureTarget(target)
    const policyResult = assertBuilderChange(current.document, document, actor, input.mode ?? 'editor', target)
    if (!policyResult.ok) throw new BuilderForbiddenError(policyResult.code, policyResult.reason)

    return this.options.repository.transaction(async (repository) => {
      const latest = await repository.getTarget(target)
      if (!latest || latest.version !== input.expectedVersion) throw new BuilderConflictError()
      const version = latest.version + 1
      const updated = await repository.updateTargetVersion(latest.id, input.expectedVersion, {
        document: asDocumentLike(document),
        version,
        updatedById: actor.id,
      })
      if (!updated) throw new BuilderConflictError()
      const revision = await repository.createRevision({
        targetId: latest.id,
        version,
        document: asDocumentLike(document),
        createdById: actor.id,
        note: input.note,
      })
      await this.options.source.write(target, serializeBuilderDocument(document))
      await repository.createAuditEvent({
        targetId: latest.id,
        action: 'builder.save',
        actorId: actor.id,
        fromVersion: latest.version,
        toVersion: version,
        revisionId: revision.id,
        requestId: input.requestId ?? randomUUID(),
        metadata: { mode: input.mode ?? 'editor' },
      })
      return { targetId: updated.id, target, document: updated.document, version, revision }
    })
  }

  async listRevisions(actor: BuilderActor, targetRef: BuilderTargetRef): Promise<BuilderRevisionRecord[]> {
    const target = await this.context(targetRef)
    this.assertPermission(actor, 'builder.history.read', target)
    const current = await this.ensureTarget(target)
    return this.options.repository.listRevisions(current.id)
  }

  async getRevision(actor: BuilderActor, targetRef: BuilderTargetRef, revisionId: string): Promise<BuilderRevisionView> {
    const target = await this.context(targetRef)
    this.assertPermission(actor, 'builder.history.read', target)
    const current = await this.ensureTarget(target)
    const revision = await this.options.repository.getRevision(current.id, revisionId)
    if (!revision) throw new BuilderNotFoundError('Builder revision was not found')
    return revision
  }

  async restore(
    actor: BuilderActor,
    targetRef: BuilderTargetRef,
    revisionId: string,
    expectedVersion: number,
    requestId?: string,
  ): Promise<BuilderMutationResult> {
    const target = await this.context(targetRef)
    this.assertPermission(actor, 'builder.history.restore', target)
    this.assertPermission(actor, requiredWritePermission(target), target)
    ensureExpectedVersion(expectedVersion)
    const current = await this.ensureTarget(target)
    const selected = await this.options.repository.getRevision(current.id, revisionId)
    if (!selected) throw new BuilderNotFoundError('Builder revision was not found')
    const policyResult = assertBuilderChange(current.document, selected.document, actor, 'editor', target)
    if (!policyResult.ok) throw new BuilderForbiddenError(policyResult.code, policyResult.reason)

    return this.options.repository.transaction(async (repository) => {
      const latest = await repository.getTarget(target)
      if (!latest || latest.version !== expectedVersion) throw new BuilderConflictError()
      const version = latest.version + 1
      const updated = await repository.updateTargetVersion(latest.id, expectedVersion, {
        document: selected.document,
        version,
        updatedById: actor.id,
      })
      if (!updated) throw new BuilderConflictError()
      const revision = await repository.createRevision({
        targetId: latest.id,
        version,
        document: selected.document,
        createdById: actor.id,
        restoredFromRevisionId: selected.id,
        note: `Restored revision ${selected.version}`,
      })
      await this.options.source.write(target, serializeBuilderDocument(selected.document as BuilderDocument))
      await repository.createAuditEvent({
        targetId: latest.id,
        action: 'builder.restore',
        actorId: actor.id,
        fromVersion: latest.version,
        toVersion: version,
        revisionId: revision.id,
        requestId: requestId ?? randomUUID(),
        metadata: { restoredFromRevisionId: selected.id },
      })
      return { targetId: updated.id, target, document: updated.document, version, revision }
    })
  }

  async listComments(actor: BuilderActor, targetRef: BuilderTargetRef): Promise<BuilderCommentRecord[]> {
    const target = await this.context(targetRef)
    this.assertPermission(actor, 'builder.comments.read', target)
    const current = await this.ensureTarget(target)
    return this.options.repository.listComments(current.id)
  }

  async createComment(actor: BuilderActor, targetRef: BuilderTargetRef, input: BuilderCommentInput): Promise<BuilderCommentRecord> {
    const target = await this.context(targetRef)
    this.assertPermission(actor, 'builder.comments.write', target)
    const body = input.body.trim()
    if (!body || body.length > 2_000) throw new BuilderInvalidDocumentError('Comment body must contain 1-2000 characters')
    const current = await this.ensureTarget(target)
    const comment = await this.options.repository.createComment({
      targetId: current.id,
      revisionId: input.revisionId,
      anchor: input.anchor,
      body,
      status: 'open',
      createdById: actor.id,
    })
    await this.options.repository.createAuditEvent({
      targetId: current.id,
      action: 'builder.comment.create',
      actorId: actor.id,
      commentId: comment.id,
      requestId: randomUUID(),
      metadata: {},
    })
    return comment
  }

  async updateComment(actor: BuilderActor, targetRef: BuilderTargetRef, commentId: string, status: 'open' | 'resolved'): Promise<BuilderCommentRecord> {
    const target = await this.context(targetRef)
    this.assertPermission(actor, 'builder.comments.write', target)
    const current = await this.ensureTarget(target)
    const exists = (await this.options.repository.listComments(current.id)).find((comment) => comment.id === commentId)
    if (!exists) throw new BuilderNotFoundError('Builder comment was not found')
    const updated = await this.options.repository.updateComment(commentId, {
      status,
      resolvedById: status === 'resolved' ? actor.id : undefined,
      resolvedAt: status === 'resolved' ? new Date() : undefined,
    })
    if (!updated) throw new BuilderNotFoundError('Builder comment was not found')
    await this.options.repository.createAuditEvent({
      targetId: current.id,
      action: `builder.comment.${status}`,
      actorId: actor.id,
      commentId: updated.id,
      requestId: randomUUID(),
      metadata: {},
    })
    return updated
  }
}
