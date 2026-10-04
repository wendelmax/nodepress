import { createManifest } from './integrity'
import { sanitizeBackupData } from './sanitize'
import type { BackupDataProvider } from './data'
import type { BackupScope, BackupSection, NodePressBackupPackage } from './types'
import type { BackupMediaSource } from './data'

export type { BackupDataProvider } from './data'

export interface BackupExportOptions {
  sections?: readonly BackupSection[]
  includeMedia?: boolean
  createdAt?: string
}

const ALL_SECTIONS: BackupSection[] = ['users', 'posts', 'taxonomies', 'options']

export class BackupExporter {
  constructor(
    private readonly provider: BackupDataProvider,
    private readonly sourceVersion: string,
  ) {}

  async export(options: BackupExportOptions = {}): Promise<NodePressBackupPackage> {
    const scope: BackupScope = {
      sections: [...new Set(options.sections ?? ALL_SECTIONS)],
      includeMedia: options.includeMedia ?? true,
    }
    const database = sanitizeBackupData(await this.provider.exportSections(scope.sections)) as Record<string, unknown[]>
    const media = scope.includeMedia ? (await this.provider.exportMedia()).map(toPackageMedia) : []
    const extensions = sanitizeBackupData({ extensions: await this.provider.exportExtensions() }).extensions as NodePressBackupPackage['extensions']
    const manifest = createManifest({
      sourceVersion: this.sourceVersion,
      scope,
      database,
      media,
      extensions,
      createdAt: options.createdAt,
    })
    return { manifest, database, media, extensions }
  }
}

function toPackageMedia(media: BackupMediaSource) {
  return {
    id: media.id,
    filename: media.filename,
    mimeType: media.mimeType,
    sourceUrl: media.sourceUrl,
    contentBase64: Buffer.from(media.content).toString('base64'),
  }
}
