import { createHash } from 'node:crypto'
import { canonicalize } from './canonical-json'
import { assertVersionCompatible } from './compatibility'
import { BACKUP_FORMAT, BACKUP_FORMAT_VERSION, type BackupManifest, type BackupManifestInput, type NodePressBackupPackage } from './types'

export function sha256(value: string | Uint8Array | unknown): string {
  const bytes = typeof value === 'string'
    ? Buffer.from(value)
    : value instanceof Uint8Array
      ? Buffer.from(value)
      : Buffer.from(canonicalize(value))
  return createHash('sha256').update(bytes).digest('hex')
}

function artifact(id: BackupManifest['artifacts'][number]['id'], content: unknown, contentType: string): BackupManifest['artifacts'][number] {
  const serialized = canonicalize(content)
  return { id, checksum: sha256(serialized), size: Buffer.byteLength(serialized), contentType }
}

export function createManifest(input: BackupManifestInput): BackupManifest {
  const artifacts = [
    artifact('database', input.database, 'application/json'),
    artifact('media', input.media, 'application/json'),
    artifact('extensions', input.extensions, 'application/json'),
  ]
  const packageChecksum = sha256({ database: input.database, media: input.media, extensions: input.extensions })
  return {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt: input.createdAt ?? new Date().toISOString(),
    source: { nodePressVersion: input.sourceVersion },
    compatibility: { minNodePressVersion: input.sourceVersion },
    scope: input.scope,
    artifacts,
    packageChecksum,
  }
}

export function validatePackageIntegrity(pkg: NodePressBackupPackage, currentVersion: string): { valid: true } {
  if (pkg.manifest.format !== BACKUP_FORMAT || pkg.manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error('Unsupported backup format')
  }
  assertVersionCompatible(currentVersion, pkg.manifest.compatibility)

  const expected = new Map([
    ['database', artifact('database', pkg.database, 'application/json')],
    ['media', artifact('media', pkg.media, 'application/json')],
    ['extensions', artifact('extensions', pkg.extensions, 'application/json')],
  ])
  for (const declared of pkg.manifest.artifacts) {
    const actual = expected.get(declared.id)
    if (!actual || actual.checksum !== declared.checksum || actual.size !== declared.size) {
      throw new Error(`Backup checksum mismatch for ${declared.id}`)
    }
  }
  if (pkg.manifest.artifacts.length !== expected.size || expected.size !== new Set(pkg.manifest.artifacts.map((item) => item.id)).size) {
    throw new Error('Backup manifest artifacts are incomplete')
  }
  const packageChecksum = sha256({ database: pkg.database, media: pkg.media, extensions: pkg.extensions })
  if (packageChecksum !== pkg.manifest.packageChecksum) throw new Error('Backup package checksum mismatch')
  return { valid: true }
}
