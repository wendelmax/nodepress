import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getBackupService: vi.fn(),
  export: vi.fn(),
  dryRun: vi.fn(),
  restore: vi.fn(),
  recordAuditEvent: vi.fn(),
}))

vi.mock('@/auth', () => ({ auth: mocks.auth }))
vi.mock('@/backup/factory', () => ({ getBackupService: mocks.getBackupService }))
vi.mock('@/audit/record', () => ({ recordAuditEvent: mocks.recordAuditEvent }))

import { GET as exportGET } from '../export/route'
import { POST as importPOST } from '../import/route'

const packageValue = {
  manifest: { format: 'nodepress-backup', formatVersion: 1, packageChecksum: 'abc' },
  database: { posts: [] },
  media: [],
  extensions: { plugins: [] },
}

describe('backup API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: '7', role: 'admin' } })
    mocks.getBackupService.mockResolvedValue({ export: mocks.export, dryRun: mocks.dryRun, restore: mocks.restore })
    mocks.export.mockResolvedValue(packageValue)
    mocks.dryRun.mockResolvedValue({ operationId: 'dry-1', dryRun: true, counts: {}, warnings: [], mediaImported: 0 })
    mocks.restore.mockResolvedValue({ operationId: 'restore-1', dryRun: false, counts: {}, warnings: [], mediaImported: 0 })
  })

  it('requires an authenticated administrator to export', async () => {
    mocks.auth.mockResolvedValueOnce({ user: { id: '7', role: 'editor' } })

    const response = await exportGET(new Request('http://localhost/api/export'))

    expect(response.status).toBe(403)
    expect(mocks.export).not.toHaveBeenCalled()
  })

  it('returns a versioned package as a download', async () => {
    const response = await exportGET(new Request('http://localhost/api/export?sections=posts&includeMedia=false'))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('content-disposition')).toContain('nodepress-backup-')
    expect(await response.json()).toEqual(packageValue)
    expect(mocks.export).toHaveBeenCalledWith({ sections: ['posts'], includeMedia: false })
  })

  it('validates imports before mutation when confirmation is absent', async () => {
    const form = new FormData()
    form.append('file', new File([JSON.stringify(packageValue)], 'backup.json', { type: 'application/json' }))

    const response = await importPOST(new Request('http://localhost/api/import', { method: 'POST', body: form }))

    expect(response.status).toBe(200)
    expect(mocks.dryRun).toHaveBeenCalled()
    expect(mocks.restore).not.toHaveBeenCalled()
  })

  it('mutates only after an explicit confirmation', async () => {
    const form = new FormData()
    form.append('file', new File([JSON.stringify(packageValue)], 'backup.json', { type: 'application/json' }))
    form.append('confirm', 'true')

    const response = await importPOST(new Request('http://localhost/api/import', { method: 'POST', body: form }))

    expect(response.status).toBe(200)
    expect(mocks.restore).toHaveBeenCalledWith(packageValue, expect.objectContaining({ confirm: true }))
    expect(mocks.dryRun).not.toHaveBeenCalled()
  })

  it('rejects malformed JSON before invoking the service', async () => {
    const form = new FormData()
    form.append('file', new File(['not-json'], 'backup.json', { type: 'application/json' }))

    const response = await importPOST(new Request('http://localhost/api/import', { method: 'POST', body: form }))

    expect(response.status).toBe(400)
    expect(mocks.dryRun).not.toHaveBeenCalled()
    expect(mocks.restore).not.toHaveBeenCalled()
  })
})
