import { describe, expect, it } from 'vitest'
import {
  InMemoryBuilderRepository,
  InMemoryBuilderSourceAdapter,
} from '../repository'
import type { BuilderDocumentLike, BuilderTargetRef } from '../domain'

const target: BuilderTargetRef = { type: 'post', key: '42' }
const document: BuilderDocumentLike = {
  version: 1,
  content: [{ type: 'Heading', props: { title: 'Initial' } }],
  root: {},
  metadata: { editor: 'puck', schemaVersion: 1 },
}

describe('builder collaboration repository contracts', () => {
  it('updates a target only when the expected version matches', async () => {
    const repository = new InMemoryBuilderRepository()
    const created = await repository.createTarget({
      targetType: target.type,
      targetKey: target.key,
      document,
      version: 0,
    })

    const updated = await repository.updateTargetVersion(created.id, 0, {
      document: { ...document, content: [{ type: 'Heading', props: { title: 'Next' } }] },
      version: 1,
      updatedById: '7',
    })
    const stale = await repository.updateTargetVersion(created.id, 0, {
      document,
      version: 1,
      updatedById: '8',
    })

    expect(updated?.version).toBe(1)
    expect(stale).toBeNull()
    expect((await repository.getTarget(target))?.document).toEqual(updated?.document)
  })

  it('keeps revisions append-only and addresses them by target and version', async () => {
    const repository = new InMemoryBuilderRepository()
    const created = await repository.createTarget({
      targetType: target.type,
      targetKey: target.key,
      document,
      version: 0,
    })

    const revision = await repository.createRevision({
      targetId: created.id,
      version: 1,
      document,
      createdById: '7',
    })
    const second = await repository.createRevision({
      targetId: created.id,
      version: 2,
      document: { ...document, content: [] },
      createdById: '8',
    })

    expect((await repository.listRevisions(created.id)).map((item) => item.version)).toEqual([2, 1])
    expect((await repository.getRevision(created.id, revision.id))?.document).toEqual(document)
    expect((await repository.getRevision(created.id, second.id))?.version).toBe(2)
  })

  it('reads legacy source values without writing during initialization', async () => {
    const source = new InMemoryBuilderSourceAdapter(new Map([[
      'post:42',
      JSON.stringify(document),
    ]]))

    expect(await source.read(target)).toBe(JSON.stringify(document))
    expect(source.writeCount).toBe(0)

    await source.write(target, JSON.stringify({ ...document, content: [] }))
    expect(source.writeCount).toBe(1)
    expect(await source.read(target)).toContain('"content":[]')
  })
})
