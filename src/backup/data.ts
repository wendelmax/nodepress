import { registeredPlugins } from '@/plugins/registry'
import type { BackupExtensions, BackupMediaEntry, BackupSection } from './types'
import type { StorageDriver } from '@/storage/StorageDriver'

export interface BackupMediaSource extends Omit<BackupMediaEntry, 'contentBase64'> {
  content: Uint8Array
}

export interface BackupDataProvider {
  exportSections(sections: readonly BackupSection[]): Promise<Record<string, unknown[]>>
  exportMedia(): Promise<BackupMediaSource[]>
  exportExtensions(): Promise<BackupExtensions>
}

export interface BackupPrismaClient {
  user: { findMany(args: unknown): Promise<unknown[]> }
  post: { findMany(args: unknown): Promise<unknown[]> }
  term: { findMany(args: unknown): Promise<unknown[]> }
  option: { findMany(args?: unknown): Promise<unknown[]> }
}

export function createPrismaBackupDataProvider(database: BackupPrismaClient, storage: StorageDriver): BackupDataProvider {
  return {
    async exportSections(sections) {
      const result: Record<string, unknown[]> = {}
      for (const section of sections) {
        if (section === 'users') {
          result.users = await database.user.findMany({
            orderBy: { id: 'asc' },
            select: { id: true, userLogin: true, userEmail: true, userNicename: true, userUrl: true, userRegistered: true, userStatus: true, displayName: true },
          })
        }
        if (section === 'posts') {
          const posts = await database.post.findMany({ orderBy: { id: 'asc' }, include: { meta: true } })
          result.posts = posts.map((post) => {
            const { postPassword: _postPassword, ...safePost } = post as Record<string, unknown>
            return safePost
          })
        }
        if (section === 'taxonomies') {
          result.taxonomies = await database.term.findMany({ orderBy: { termId: 'asc' }, include: { taxonomies: true, meta: true } })
        }
        if (section === 'options') result.options = await database.option.findMany({ orderBy: { optionId: 'asc' } })
      }
      return result
    },

    async exportMedia() {
      const attachments = await database.post.findMany({
        where: { postType: 'attachment', postStatus: 'inherit' },
        orderBy: { id: 'asc' },
        select: { id: true, postName: true, postMimeType: true, guid: true, postTitle: true },
      }) as Array<{ id: number; postName: string; postMimeType: string; guid: string; postTitle: string }>
      const media: BackupMediaSource[] = []
      for (const attachment of attachments) {
        const content = await storage.read(attachment.guid)
        if (!content) throw new Error(`Media content is missing for attachment ${attachment.id}`)
        media.push({
          id: attachment.id,
          filename: attachment.postName || attachment.postTitle,
          mimeType: attachment.postMimeType,
          sourceUrl: attachment.guid,
          content,
        })
      }
      return media
    },

    async exportExtensions() {
      const options = await database.option.findMany({ where: { optionName: { in: ['active_theme', 'active_plugins'] } } }) as Array<{ optionName: string; optionValue: string }>
      const activeTheme = options.find((option) => option.optionName === 'active_theme')?.optionValue
      const rawPlugins = options.find((option) => option.optionName === 'active_plugins')?.optionValue
      let activePluginIds: string[] = []
      try {
        const parsed = rawPlugins ? JSON.parse(rawPlugins) : []
        activePluginIds = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
      } catch {
        activePluginIds = []
      }
      return {
        theme: activeTheme ? { id: activeTheme } : undefined,
        plugins: activePluginIds.map((id) => ({ id, version: registeredPlugins.find((plugin) => plugin.id === id)?.version ?? 'unknown' })),
      }
    },
  }
}
