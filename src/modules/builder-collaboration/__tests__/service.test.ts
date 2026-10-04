import { describe, expect, it } from 'vitest'
import {
  BuilderConflictError,
  BuilderForbiddenError,
} from '../errors'
import { InMemoryBuilderRepository, InMemoryBuilderSourceAdapter } from '../repository'
import { BuilderService } from '../service'
import type { BuilderActor, BuilderDocumentLike, BuilderTargetRef } from '../domain'

const target: BuilderTargetRef = { type: 'post', key: '42', ownerId: '7', status: 'draft' }
const initial: BuilderDocumentLike = {
  version: 1,
  content: [{ type: 'Heading', props: { title: 'Initial', align: 'left' } }],
  root: {},
  metadata: { editor: 'puck', schemaVersion: 1 },
}

function service(sourceValue: BuilderDocumentLike = initial) {
  const repository = new InMemoryBuilderRepository()
  const source = new InMemoryBuilderSourceAdapter(new Map([['post:42', JSON.stringify(sourceValue)]]))
  return {
    repository,
    source,
    service: new BuilderService({ repository, source }),
  }
}

const admin: BuilderActor = { id: '1', role: 'admin' }
const client: BuilderActor = { id: '8', role: 'client' }

function changed(title: string): BuilderDocumentLike {
  return { ...initial, content: [{ type: 'Heading', props: { title, align: 'left' } }] }
}

describe('builder collaboration service', () => {
  it('initializes a target from the legacy source without creating a revision', async () => {
    const { service: builder, repository } = service()

    const view = await builder.getTarget(admin, target)

    expect(view.version).toBe(0)
    expect(view.document).toEqual(initial)
    expect(await repository.listRevisions(view.targetId)).toEqual([])
  })

  it('saves a new immutable revision and synchronizes the source', async () => {
    const { service: builder, source } = service()

    const saved = await builder.save(admin, target, {
      document: changed('Saved'),
      expectedVersion: 0,
      requestId: 'request-save',
    })

    expect(saved.version).toBe(1)
    expect(saved.revision.version).toBe(1)
    expect(await source.read(target)).toContain('Saved')
  })

  it('rejects a stale concurrent save without adding a revision or changing source', async () => {
    const { service: builder, source, repository } = service()
    await builder.save(admin, target, { document: changed('First'), expectedVersion: 0, requestId: 'first' })

    await expect(builder.save(admin, target, {
      document: changed('Stale'),
      expectedVersion: 0,
      requestId: 'stale',
    })).rejects.toBeInstanceOf(BuilderConflictError)

    const current = await builder.getTarget(admin, target)
    expect(current.version).toBe(1)
    expect(current.document).toEqual(changed('First'))
    expect((await repository.listRevisions(current.targetId)).map((revision) => revision.version)).toEqual([1])
    expect(await source.read(target)).toContain('First')
  })

  it('restores by creating a revision and can reverse that restore', async () => {
    const { service: builder, repository } = service()
    const first = await builder.save(admin, target, { document: changed('First'), expectedVersion: 0, requestId: 'first' })
    const second = await builder.save(admin, target, { document: changed('Second'), expectedVersion: 1, requestId: 'second' })

    const restored = await builder.restore(admin, target, first.revision.id, 2, 'restore-first')
    expect(restored.version).toBe(3)
    expect(restored.document).toEqual(changed('First'))

    const reversed = await builder.restore(admin, target, second.revision.id, 3, 'restore-second')
    expect(reversed.version).toBe(4)
    expect(reversed.document).toEqual(changed('Second'))

    const revisions = await builder.listRevisions(admin, target)
    expect(revisions).toHaveLength(4)
    expect(revisions.find((revision) => revision.version === 3)?.restoredFromRevisionId).toBe(first.revision.id)
    expect(revisions.find((revision) => revision.version === 4)?.restoredFromRevisionId).toBe(second.revision.id)
    expect(await repository.getRevision(revisions[0].targetId, first.revision.id)).toEqual(first.revision)
  })

  it('keeps comments private and requires comment permission to create or resolve them', async () => {
    const { service: builder } = service()
    const comment = await builder.createComment(admin, target, { body: 'Review this heading', anchor: '/content/0' })

    expect((await builder.listComments(admin, target))[0].body).toBe('Review this heading')
    await builder.updateComment(admin, target, comment.id, 'resolved')
    expect((await builder.listComments(admin, target))[0].status).toBe('resolved')

    await expect(builder.createComment(client, target, { body: 'Should be private' })).rejects.toBeInstanceOf(BuilderForbiddenError)
    await expect(builder.listComments(client, target)).rejects.toBeInstanceOf(BuilderForbiddenError)
  })
})
