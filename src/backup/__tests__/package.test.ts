import { describe, expect, it } from 'vitest'
import {
  BACKUP_FORMAT,
  BACKUP_FORMAT_VERSION,
  type NodePressBackupPackage,
  type BackupScope,
  type BackupMediaEntry,
} from '@/backup/types'
import { canonicalize } from '@/backup/canonical-json'
import { createManifest, validatePackageIntegrity } from '@/backup/integrity'

const scope: BackupScope = { sections: ['posts', 'options'], includeMedia: false }

function createPackage(): NodePressBackupPackage {
  const database = {
    posts: [{ id: 1, postTitle: 'Hello' }],
    options: [{ optionName: 'blogname', optionValue: 'NodePress' }],
  }
  const media: BackupMediaEntry[] = []
  const extensions = { theme: { id: 'default' }, plugins: [{ id: 'seo', version: '1.0.0' }] }
  return {
    manifest: createManifest({
      sourceVersion: '0.4.6',
      scope,
      database,
      media,
      extensions,
      createdAt: '2026-10-04T00:00:00.000Z',
    }),
    database,
    media,
    extensions,
  }
}

describe('NodePress backup package', () => {
  it('canonicalizes object keys without changing array order', () => {
    expect(canonicalize({ b: 1, a: { d: 2, c: 3 }, list: [2, 1] }))
      .toBe('{"a":{"c":3,"d":2},"b":1,"list":[2,1]}')
  })

  it('creates and validates a versioned package with checksums', () => {
    const pkg = createPackage()

    expect(pkg.manifest.format).toBe(BACKUP_FORMAT)
    expect(pkg.manifest.formatVersion).toBe(BACKUP_FORMAT_VERSION)
    expect(pkg.manifest.artifacts.map((artifact) => artifact.id)).toEqual(['database', 'media', 'extensions'])
    expect(validatePackageIntegrity(pkg, '0.4.7')).toMatchObject({ valid: true })
  })

  it('rejects a package whose payload was changed after export', () => {
    const pkg = createPackage()
    ;(pkg.database.posts as Array<Record<string, unknown>>)[0].postTitle = 'tampered'

    expect(() => validatePackageIntegrity(pkg, '0.4.7')).toThrow(/checksum/i)
  })

  it('rejects unsupported format versions before compatibility checks', () => {
    const pkg = createPackage()
    ;(pkg.manifest as { formatVersion: number }).formatVersion = 2

    expect(() => validatePackageIntegrity(pkg, '0.4.7')).toThrow(/format/i)
  })

  it('rejects a target NodePress version below the manifest minimum', () => {
    const pkg = createPackage()

    expect(() => validatePackageIntegrity(pkg, '0.3.9')).toThrow(/compatib/i)
  })
})
