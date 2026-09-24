import { describe, expect, it } from 'vitest'
import { parseLegacyExportPage } from '../contracts'

describe('legacy bridge contract', () => {
  it('rejects an export page with an unsupported contract version', () => {
    expect(() => parseLegacyExportPage({ contractVersion: '2' })).toThrow('Unsupported bridge contract')
  })

  it('accepts a valid version-one export page', () => {
    expect(parseLegacyExportPage({
      contractVersion: '1',
      resource: 'animals',
      runId: 'run-1',
      watermark: '2026-09-24T00:00:00.000Z',
      items: [{ legacyId: 'animal-1', updatedAt: '2026-09-23T23:59:00.000Z', payload: { name: 'Luna' } }],
      pageChecksum: 'sha256:page',
    })).toMatchObject({ resource: 'animals', runId: 'run-1' })
  })
})
