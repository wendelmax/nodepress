import { describe, expect, it } from 'vitest'
import { BackupExporter, type BackupDataProvider } from '@/backup/exporter'
import { planImport } from '@/backup/importer'

function provider(): BackupDataProvider {
  return {
    async exportSections(sections) {
      const data = {
        posts: [{ id: 1, postContent: 'https://old.example/post' }],
        options: [{ optionName: 'blogname', optionValue: 'NodePress' }],
        users: [{ id: 3, userLogin: 'editor' }],
        taxonomies: [{ termId: 9, name: 'News' }],
      }
      return Object.fromEntries(sections.map((section) => [section, data[section]]))
    },
    async exportMedia() {
      return [{ id: 10, filename: 'hero.jpg', mimeType: 'image/jpeg', sourceUrl: '/uploads/hero.jpg', content: Buffer.from('image') }]
    },
    async exportExtensions() {
      return { theme: { id: 'default', version: '1.0.0' }, plugins: [{ id: 'seo', version: '1.0.0' }] }
    },
  }
}

describe('backup export and import planning', () => {
  it('exports selected database sections and media into a versioned package', async () => {
    const pkg = await new BackupExporter(provider(), '0.4.6').export({
      sections: ['posts', 'options'],
      includeMedia: true,
      createdAt: '2026-10-04T00:00:00.000Z',
    })

    expect(Object.keys(pkg.database)).toEqual(['posts', 'options'])
    expect(pkg.media[0].contentBase64).toBe(Buffer.from('image').toString('base64'))
    expect(pkg.manifest.scope).toEqual({ sections: ['posts', 'options'], includeMedia: true })
  })

  it('plans a URL-normalized import without mutating the input or writing data', async () => {
    const pkg = await new BackupExporter(provider(), '0.4.6').export({ sections: ['posts'], includeMedia: false })
    const plan = planImport(pkg, {
      fromUrl: 'https://old.example',
      toUrl: 'https://new.example',
      existingIds: { posts: new Set([1]) },
    })

    expect(plan.database.posts[0]).toEqual({ id: 1, postContent: 'https://new.example/post' })
    expect(plan.counts.posts).toEqual({ total: 1, insertable: 0, skipped: 1 })
    expect((pkg.database.posts as Array<Record<string, unknown>>)[0]).toEqual({ id: 1, postContent: 'https://old.example/post' })
  })

  it('rejects malformed section payloads before planning', () => {
    const invalid = { manifest: {}, database: { posts: 'not-an-array' }, media: [], extensions: { plugins: [] } } as any

    expect(() => planImport(invalid)).toThrow(/posts/i)
  })
})
