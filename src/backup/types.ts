export const BACKUP_FORMAT = 'nodepress-backup' as const
export const BACKUP_FORMAT_VERSION = 1 as const

export type BackupSection = 'users' | 'posts' | 'taxonomies' | 'options'

export interface BackupScope {
  sections: BackupSection[]
  includeMedia: boolean
}

export interface BackupMediaEntry {
  id: number
  filename: string
  mimeType: string
  sourceUrl: string
  contentBase64: string
}

export interface BackupArtifact {
  id: 'database' | 'media' | 'extensions'
  checksum: string
  size: number
  contentType: string
}

export interface BackupManifest {
  format: typeof BACKUP_FORMAT
  formatVersion: typeof BACKUP_FORMAT_VERSION
  createdAt: string
  source: { nodePressVersion: string }
  compatibility: { minNodePressVersion: string; maxNodePressVersion?: string }
  scope: BackupScope
  artifacts: BackupArtifact[]
  packageChecksum: string
}

export interface BackupExtensions {
  theme?: { id: string; version?: string }
  plugins: Array<{ id: string; version: string }>
}

export interface NodePressBackupPackage {
  manifest: BackupManifest
  database: Record<string, unknown>
  media: BackupMediaEntry[]
  extensions: BackupExtensions
}

export interface BackupManifestInput {
  sourceVersion: string
  scope: BackupScope
  database: Record<string, unknown>
  media: BackupMediaEntry[]
  extensions: BackupExtensions
  createdAt?: string
}
