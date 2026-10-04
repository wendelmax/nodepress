import type { BuilderDocumentLike, BuilderTargetRef } from './domain'

export interface BuilderTargetRecord {
  id: string
  targetType: BuilderTargetRef['type']
  targetKey: string
  document: BuilderDocumentLike
  version: number
  updatedById?: string
  updatedAt: Date
}

export interface BuilderRevisionRecord {
  id: string
  targetId: string
  version: number
  document: BuilderDocumentLike
  createdById: string
  note?: string
  restoredFromRevisionId?: string
  createdAt: Date
}

export interface BuilderCommentRecord {
  id: string
  targetId: string
  revisionId?: string
  anchor?: string
  body: string
  status: 'open' | 'resolved'
  createdById: string
  resolvedById?: string
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
}

export interface BuilderAuditEventRecord {
  id: string
  targetId?: string
  action: string
  actorId?: string
  fromVersion?: number
  toVersion?: number
  revisionId?: string
  commentId?: string
  requestId: string
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface CreateTargetInput {
  targetType: BuilderTargetRef['type']
  targetKey: string
  document: BuilderDocumentLike
  version: number
}

export interface BuilderRepository {
  getTarget(target: BuilderTargetRef): Promise<BuilderTargetRecord | null>
  createTarget(input: CreateTargetInput): Promise<BuilderTargetRecord>
  updateTargetVersion(targetId: string, expectedVersion: number, input: {
    document: BuilderDocumentLike
    version: number
    updatedById: string
  }): Promise<BuilderTargetRecord | null>
  createRevision(input: Omit<BuilderRevisionRecord, 'id' | 'createdAt'>): Promise<BuilderRevisionRecord>
  listRevisions(targetId: string): Promise<BuilderRevisionRecord[]>
  getRevision(targetId: string, revisionId: string): Promise<BuilderRevisionRecord | null>
  createComment(input: Omit<BuilderCommentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BuilderCommentRecord>
  listComments(targetId: string): Promise<BuilderCommentRecord[]>
  updateComment(id: string, input: Pick<BuilderCommentRecord, 'status' | 'resolvedById' | 'resolvedAt'>): Promise<BuilderCommentRecord | null>
  createAuditEvent(input: Omit<BuilderAuditEventRecord, 'id' | 'createdAt'>): Promise<BuilderAuditEventRecord>
  transaction<T>(work: (repository: BuilderRepository, source?: BuilderSourceAdapter) => Promise<T>): Promise<T>
}

export interface BuilderSourceAdapter {
  read(target: BuilderTargetRef): Promise<string | null>
  write(target: BuilderTargetRef, serializedDocument: string): Promise<void>
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function keyFor(target: BuilderTargetRef): string {
  return `${target.type}:${target.key}`
}

export class InMemoryBuilderRepository implements BuilderRepository {
  private readonly targets = new Map<string, BuilderTargetRecord>()
  private readonly revisions = new Map<string, BuilderRevisionRecord>()
  private readonly comments = new Map<string, BuilderCommentRecord>()
  private readonly auditEvents: BuilderAuditEventRecord[] = []
  private sequence = 0

  async getTarget(target: BuilderTargetRef): Promise<BuilderTargetRecord | null> {
    const record = this.targets.get(keyFor(target))
    return record ? clone(record) : null
  }

  async createTarget(input: CreateTargetInput): Promise<BuilderTargetRecord> {
    const record: BuilderTargetRecord = {
      id: `target-${++this.sequence}`,
      ...input,
      updatedAt: new Date(),
    }
    this.targets.set(keyFor({ type: input.targetType, key: input.targetKey }), record)
    return clone(record)
  }

  async updateTargetVersion(targetId: string, expectedVersion: number, input: {
    document: BuilderDocumentLike
    version: number
    updatedById: string
  }): Promise<BuilderTargetRecord | null> {
    const record = [...this.targets.values()].find((candidate) => candidate.id === targetId)
    if (!record || record.version !== expectedVersion) return null
    Object.assign(record, { ...input, updatedAt: new Date() })
    return clone(record)
  }

  async createRevision(input: Omit<BuilderRevisionRecord, 'id' | 'createdAt'>): Promise<BuilderRevisionRecord> {
    const record = { ...input, id: `revision-${++this.sequence}`, createdAt: new Date() }
    this.revisions.set(record.id, record)
    return clone(record)
  }

  async listRevisions(targetId: string): Promise<BuilderRevisionRecord[]> {
    return [...this.revisions.values()]
      .filter((revision) => revision.targetId === targetId)
      .sort((left, right) => right.version - left.version)
      .map(clone)
  }

  async getRevision(targetId: string, revisionId: string): Promise<BuilderRevisionRecord | null> {
    const revision = this.revisions.get(revisionId)
    return revision && revision.targetId === targetId ? clone(revision) : null
  }

  async createComment(input: Omit<BuilderCommentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BuilderCommentRecord> {
    const now = new Date()
    const record = { ...input, id: `comment-${++this.sequence}`, createdAt: now, updatedAt: now }
    this.comments.set(record.id, record)
    return clone(record)
  }

  async listComments(targetId: string): Promise<BuilderCommentRecord[]> {
    return [...this.comments.values()]
      .filter((comment) => comment.targetId === targetId)
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
      .map(clone)
  }

  async updateComment(id: string, input: Pick<BuilderCommentRecord, 'status' | 'resolvedById' | 'resolvedAt'>): Promise<BuilderCommentRecord | null> {
    const record = this.comments.get(id)
    if (!record) return null
    Object.assign(record, input, { updatedAt: new Date() })
    return clone(record)
  }

  async createAuditEvent(input: Omit<BuilderAuditEventRecord, 'id' | 'createdAt'>): Promise<BuilderAuditEventRecord> {
    const record = { ...input, id: `audit-${++this.sequence}`, createdAt: new Date() }
    this.auditEvents.push(record)
    return clone(record)
  }

  async transaction<T>(work: (repository: BuilderRepository, source?: BuilderSourceAdapter) => Promise<T>): Promise<T> {
    return work(this)
  }
}

export class InMemoryBuilderSourceAdapter implements BuilderSourceAdapter {
  public writeCount = 0

  constructor(private readonly values = new Map<string, string>()) {}

  async read(target: BuilderTargetRef): Promise<string | null> {
    return this.values.get(keyFor(target)) ?? null
  }

  async write(target: BuilderTargetRef, serializedDocument: string): Promise<void> {
    this.writeCount += 1
    this.values.set(keyFor(target), serializedDocument)
  }
}

export type PrismaLikeClient = {
  builderTarget: any
  builderRevision: any
  builderComment: any
  builderAuditEvent: any
  post: any
  option: any
  $transaction<T>(work: (client: PrismaLikeClient) => Promise<T>): Promise<T>
}

function targetRecord(value: any): BuilderTargetRecord {
  return {
    id: value.id,
    targetType: value.targetType,
    targetKey: value.targetKey,
    document: value.document as BuilderDocumentLike,
    version: value.version,
    updatedById: value.updatedById === null || value.updatedById === undefined ? undefined : String(value.updatedById),
    updatedAt: value.updatedAt,
  }
}

function revisionRecord(value: any): BuilderRevisionRecord {
  return {
    id: value.id,
    targetId: value.targetId,
    version: value.version,
    document: value.document as BuilderDocumentLike,
    createdById: String(value.createdById),
    note: value.note ?? undefined,
    restoredFromRevisionId: value.restoredFromRevisionId ?? undefined,
    createdAt: value.createdAt,
  }
}

function commentRecord(value: any): BuilderCommentRecord {
  return {
    id: value.id,
    targetId: value.targetId,
    revisionId: value.revisionId ?? undefined,
    anchor: value.anchor ?? undefined,
    body: value.body,
    status: value.status,
    createdById: String(value.createdById),
    resolvedById: value.resolvedById === null || value.resolvedById === undefined ? undefined : String(value.resolvedById),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    resolvedAt: value.resolvedAt ?? undefined,
  }
}

export class PrismaBuilderRepository implements BuilderRepository {
  constructor(private readonly client: PrismaLikeClient) {}

  async getTarget(target: BuilderTargetRef): Promise<BuilderTargetRecord | null> {
    const record = await this.client.builderTarget.findUnique({
      where: { targetType_targetKey: { targetType: target.type, targetKey: target.key } },
    })
    return record ? targetRecord(record) : null
  }

  async createTarget(input: CreateTargetInput): Promise<BuilderTargetRecord> {
    return targetRecord(await this.client.builderTarget.create({ data: {
      targetType: input.targetType,
      targetKey: input.targetKey,
      document: input.document,
      version: input.version,
    } }))
  }

  async updateTargetVersion(targetId: string, expectedVersion: number, input: {
    document: BuilderDocumentLike
    version: number
    updatedById: string
  }): Promise<BuilderTargetRecord | null> {
    const result = await this.client.builderTarget.updateMany({
      where: { id: targetId, version: expectedVersion },
      data: {
        document: input.document,
        version: input.version,
        updatedById: Number(input.updatedById),
      },
    })
    if (result.count !== 1) return null
    const record = await this.client.builderTarget.findUnique({ where: { id: targetId } })
    return record ? targetRecord(record) : null
  }

  async createRevision(input: Omit<BuilderRevisionRecord, 'id' | 'createdAt'>): Promise<BuilderRevisionRecord> {
    return revisionRecord(await this.client.builderRevision.create({ data: {
      targetId: input.targetId,
      version: input.version,
      document: input.document,
      createdById: Number(input.createdById),
      note: input.note,
      restoredFromRevisionId: input.restoredFromRevisionId,
    } }))
  }

  async listRevisions(targetId: string): Promise<BuilderRevisionRecord[]> {
    const records = await this.client.builderRevision.findMany({
      where: { targetId },
      orderBy: { version: 'desc' },
    })
    return records.map(revisionRecord)
  }

  async getRevision(targetId: string, revisionId: string): Promise<BuilderRevisionRecord | null> {
    const record = await this.client.builderRevision.findFirst({ where: { id: revisionId, targetId } })
    return record ? revisionRecord(record) : null
  }

  async createComment(input: Omit<BuilderCommentRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BuilderCommentRecord> {
    return commentRecord(await this.client.builderComment.create({ data: {
      targetId: input.targetId,
      revisionId: input.revisionId,
      anchor: input.anchor,
      body: input.body,
      status: input.status,
      createdById: Number(input.createdById),
      resolvedById: input.resolvedById ? Number(input.resolvedById) : undefined,
      resolvedAt: input.resolvedAt,
    } }))
  }

  async listComments(targetId: string): Promise<BuilderCommentRecord[]> {
    const records = await this.client.builderComment.findMany({
      where: { targetId },
      orderBy: { createdAt: 'asc' },
    })
    return records.map(commentRecord)
  }

  async updateComment(id: string, input: Pick<BuilderCommentRecord, 'status' | 'resolvedById' | 'resolvedAt'>): Promise<BuilderCommentRecord | null> {
    try {
      const record = await this.client.builderComment.update({
        where: { id },
        data: {
          status: input.status,
          resolvedById: input.resolvedById ? Number(input.resolvedById) : null,
          resolvedAt: input.resolvedAt ?? null,
        },
      })
      return commentRecord(record)
    } catch {
      return null
    }
  }

  async createAuditEvent(input: Omit<BuilderAuditEventRecord, 'id' | 'createdAt'>): Promise<BuilderAuditEventRecord> {
    const record = await this.client.builderAuditEvent.create({ data: {
      targetId: input.targetId,
      action: input.action,
      actorId: input.actorId ? Number(input.actorId) : undefined,
      fromVersion: input.fromVersion,
      toVersion: input.toVersion,
      revisionId: input.revisionId,
      commentId: input.commentId,
      requestId: input.requestId,
      metadata: input.metadata,
    } })
    return {
      id: record.id,
      targetId: record.targetId ?? undefined,
      action: record.action,
      actorId: record.actorId === null || record.actorId === undefined ? undefined : String(record.actorId),
      fromVersion: record.fromVersion ?? undefined,
      toVersion: record.toVersion ?? undefined,
      revisionId: record.revisionId ?? undefined,
      commentId: record.commentId ?? undefined,
      requestId: record.requestId,
      metadata: record.metadata as Record<string, unknown>,
      createdAt: record.createdAt,
    }
  }

  async transaction<T>(work: (repository: BuilderRepository, source?: BuilderSourceAdapter) => Promise<T>): Promise<T> {
    return this.client.$transaction((client) => {
      const transactionClient = client as PrismaLikeClient
      return work(
        new PrismaBuilderRepository(transactionClient),
        new PrismaBuilderSourceAdapter(transactionClient),
      )
    })
  }
}

export class PrismaBuilderSourceAdapter implements BuilderSourceAdapter {
  constructor(private readonly client: PrismaLikeClient) {}

  async read(target: BuilderTargetRef): Promise<string | null> {
    if (target.type === 'post') {
      const post = await this.client.post.findUnique({ where: { id: Number(target.key) }, select: { postContent: true } })
      return post?.postContent ?? null
    }

    const option = await this.client.option.findUnique({ where: { optionName: target.key }, select: { optionValue: true } })
    return option?.optionValue ?? null
  }

  async write(target: BuilderTargetRef, serializedDocument: string): Promise<void> {
    if (target.type === 'post') {
      await this.client.post.update({ where: { id: Number(target.key) }, data: { postContent: serializedDocument } })
      return
    }

    await this.client.option.upsert({
      where: { optionName: target.key },
      update: { optionValue: serializedDocument },
      create: { optionName: target.key, optionValue: serializedDocument, autoload: 'no' },
    })
  }
}
