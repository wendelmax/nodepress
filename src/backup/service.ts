import { randomUUID } from 'node:crypto'
import { BackupExporter, type BackupDataProvider, type BackupExportOptions } from './exporter'
import { planImport, type ImportPlan, type ImportPlanOptions } from './importer'
import { validatePackageIntegrity } from './integrity'
import type { BackupSection, NodePressBackupPackage } from './types'

export interface BackupRestoreTransaction {
  insert(section: BackupSection, row: unknown): Promise<boolean>
}

export interface BackupRestoreDatabase {
  existingIds(section: BackupSection): Promise<ReadonlySet<string | number>>
  transaction<T>(callback: (transaction: BackupRestoreTransaction) => Promise<T>): Promise<T>
}

export interface BackupMediaStorage {
  upload(content: Buffer, filename: string, mimeType: string): Promise<string>
  delete(fileUrl: string): Promise<void>
}

export interface BackupProgress {
  operationId: string
  stage: 'export' | 'validation' | 'media' | 'database' | 'complete' | 'failed'
  completed: number
  total: number
}

export interface BackupAuditEvent {
  operationId: string
  action: 'backup.export.started' | 'backup.export.completed' | 'backup.export.failed' | 'backup.restore.started' | 'backup.restore.completed' | 'backup.restore.failed'
  stage: BackupProgress['stage']
  success: boolean
  details?: Record<string, unknown>
}

export interface BackupServiceDependencies {
  currentVersion: string
  provider: BackupDataProvider
  database: BackupRestoreDatabase
  mediaStorage?: BackupMediaStorage
  onProgress?: (progress: BackupProgress) => void | Promise<void>
  audit?: (event: BackupAuditEvent) => void | Promise<void>
}

export interface RestoreOptions extends ImportPlanOptions {
  confirm?: boolean
  dryRun?: boolean
  signal?: AbortSignal
}

export interface RestoreResult {
  operationId: string
  dryRun: boolean
  counts: ImportPlan['counts']
  warnings: string[]
  mediaImported: number
}

export class BackupService {
  private readonly exporter: BackupExporter

  constructor(private readonly dependencies: BackupServiceDependencies) {
    this.exporter = new BackupExporter(dependencies.provider, dependencies.currentVersion)
  }

  async export(options?: BackupExportOptions): Promise<NodePressBackupPackage> {
    const operationId = randomUUID()
    await this.audit({ operationId, action: 'backup.export.started', stage: 'export', success: true })
    await this.progress({ operationId, stage: 'export', completed: 0, total: 1 })
    try {
      const pkg = await this.exporter.export(options)
      await this.audit({ operationId, action: 'backup.export.completed', stage: 'complete', success: true, details: { checksum: pkg.manifest.packageChecksum } })
      await this.progress({ operationId, stage: 'complete', completed: 1, total: 1 })
      return pkg
    } catch (error) {
      await this.audit({ operationId, action: 'backup.export.failed', stage: 'failed', success: false, details: { error: error instanceof Error ? error.message : 'export failed' } })
      await this.progress({ operationId, stage: 'failed', completed: 0, total: 1 })
      throw error
    }
  }

  async dryRun(pkg: NodePressBackupPackage, options: RestoreOptions = {}): Promise<RestoreResult> {
    const operationId = randomUUID()
    await this.validateAndAudit(pkg, operationId)
    const plan = await this.createPlan(pkg, options)
    await this.progress({ operationId, stage: 'validation', completed: 1, total: 1 })
    return {
      operationId,
      dryRun: true,
      counts: plan.counts,
      warnings: plan.warnings,
      mediaImported: 0,
    }
  }

  async restore(pkg: NodePressBackupPackage, options: RestoreOptions = {}): Promise<RestoreResult> {
    if (options.dryRun) return this.dryRun(pkg, options)
    if (options.confirm !== true) throw new Error('Restore confirmation is required')

    const operationId = randomUUID()
    const uploaded: string[] = []
    try {
      await this.validateAndAudit(pkg, operationId)
      const plan = await this.createPlan(pkg, options)
      this.throwIfAborted(options.signal)

      const mediaUrls = new Map<number, string>()
      if (plan.media.length > 0) {
        if (!this.dependencies.mediaStorage) throw new Error('Media storage is not configured')
        for (let index = 0; index < plan.media.length; index += 1) {
          this.throwIfAborted(options.signal)
          const media = plan.media[index]
          const url = await this.dependencies.mediaStorage.upload(Buffer.from(media.contentBase64, 'base64'), media.filename, media.mimeType)
          uploaded.push(url)
          mediaUrls.set(media.id, url)
          await this.progress({ operationId, stage: 'media', completed: index + 1, total: plan.media.length })
        }
      }

      let inserted = 0
      await this.dependencies.database.transaction(async (transaction) => {
        for (const section of ['users', 'options', 'taxonomies', 'posts'] as BackupSection[]) {
          for (const row of plan.database[section] ?? []) {
            this.throwIfAborted(options.signal)
            if (await transaction.insert(section, rewriteMediaReference(section, row, mediaUrls))) inserted += 1
          }
        }
      })
      await this.progress({ operationId, stage: 'database', completed: inserted, total: inserted })
      await this.audit({ operationId, action: 'backup.restore.completed', stage: 'complete', success: true, details: { inserted, mediaImported: uploaded.length } })
      await this.progress({ operationId, stage: 'complete', completed: 1, total: 1 })
      return { operationId, dryRun: false, counts: plan.counts, warnings: plan.warnings, mediaImported: uploaded.length }
    } catch (error) {
      if (this.dependencies.mediaStorage) {
        await Promise.allSettled(uploaded.map((url) => this.dependencies.mediaStorage!.delete(url)))
      }
      await this.audit({ operationId, action: 'backup.restore.failed', stage: 'failed', success: false, details: { error: error instanceof Error ? error.message : 'restore failed' } })
      await this.progress({ operationId, stage: 'failed', completed: 0, total: 1 })
      throw error
    }
  }

  private async validateAndAudit(pkg: NodePressBackupPackage, operationId: string): Promise<void> {
    validatePackageIntegrity(pkg, this.dependencies.currentVersion)
    await this.audit({ operationId, action: 'backup.restore.started', stage: 'validation', success: true, details: { checksum: pkg.manifest.packageChecksum } })
  }

  private async createPlan(pkg: NodePressBackupPackage, options: ImportPlanOptions): Promise<ImportPlan> {
    const sections = Object.keys(pkg.database) as BackupSection[]
    const existingIds: Record<string, ReadonlySet<string | number>> = {}
    for (const section of sections) existingIds[section] = await this.dependencies.database.existingIds(section)
    return planImport(pkg, { ...options, existingIds })
  }

  private async progress(value: BackupProgress): Promise<void> {
    try { await this.dependencies.onProgress?.(value) } catch { /* observers must not change restore semantics */ }
  }

  private async audit(value: BackupAuditEvent): Promise<void> {
    try { await this.dependencies.audit?.(value) } catch { /* audit failure must not mutate restore semantics */ }
  }

  private throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) throw new Error('Backup restore aborted')
  }
}

export interface PrismaBackupRestoreClient {
  user: { findMany(args: unknown): Promise<Array<{ id: number }>>; create(args: unknown): Promise<unknown> }
  post: { findMany(args: unknown): Promise<Array<{ id: number }>>; create(args: unknown): Promise<unknown> }
  term: { findMany(args: unknown): Promise<Array<{ termId: number }>>; create(args: unknown): Promise<unknown> }
  option: { findMany(args: unknown): Promise<Array<{ optionName: string }>>; create(args: unknown): Promise<unknown> }
  $transaction<T>(callback: (transaction: PrismaBackupRestoreClient) => Promise<T>): Promise<T>
}

export function createPrismaBackupRestoreDatabase(database: PrismaBackupRestoreClient): BackupRestoreDatabase {
  return {
    async existingIds(section) {
      if (section === 'users') return new Set((await database.user.findMany({ select: { id: true } })).map((row) => row.id))
      if (section === 'posts') return new Set((await database.post.findMany({ select: { id: true } })).map((row) => row.id))
      if (section === 'taxonomies') return new Set((await database.term.findMany({ select: { termId: true } })).map((row) => row.termId))
      return new Set((await database.option.findMany({ select: { optionName: true } })).map((row) => row.optionName))
    },
    async transaction(callback) {
      return database.$transaction((transaction) => callback(createPrismaTransaction(transaction)))
    },
  }
}

function createPrismaTransaction(database: PrismaBackupRestoreClient): BackupRestoreTransaction {
  return {
    async insert(section, row) {
      const value = row as Record<string, unknown>
      if (section === 'users') {
        await database.user.create({ data: { ...value, userPass: `$nodepress$unusable$${randomUUID()}`, userActivationKey: '', userStatus: 1 } })
      } else if (section === 'posts') {
        const { meta: _meta, author: _author, comments: _comments, children: _children, parent: _parent, ...post } = value
        await database.post.create({ data: { ...post, postPassword: '' } })
      } else if (section === 'taxonomies') {
        const { taxonomies: _taxonomies, meta: _meta, ...term } = value
        await database.term.create({ data: term })
      } else {
        await database.option.create({ data: value })
      }
      return true
    },
  }
}

function rewriteMediaReference(section: BackupSection, row: unknown, mediaUrls: ReadonlyMap<number, string>): unknown {
  if (section !== 'posts' || !row || typeof row !== 'object') return row
  const value = row as Record<string, unknown>
  const id = typeof value.id === 'number' ? value.id : undefined
  const url = id === undefined ? undefined : mediaUrls.get(id)
  return url ? { ...value, guid: url } : value
}
