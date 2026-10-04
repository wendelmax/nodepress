import { describe, expect, it } from 'vitest'
import {
  assertBuilderChange,
  canBuilder,
  getBuilderPermissions,
  getClientEditableFields,
} from '../policy'
import type { BuilderActor, BuilderDocumentLike, BuilderTargetRef } from '../domain'

const postTarget: BuilderTargetRef = {
  type: 'post',
  key: '42',
  ownerId: '7',
  status: 'draft',
}

const document: BuilderDocumentLike = {
  version: 1,
  content: [
    { type: 'Heading', props: { title: 'Hello', level: 'h2' } },
    { type: 'Button', props: { label: 'Read', href: '/read', variant: 'primary' } },
  ],
  root: { props: { title: 'Page' } },
  metadata: { editor: 'puck', schemaVersion: 1 },
}

function actor(id: string, role: string): BuilderActor {
  return { id, role }
}

describe('builder collaboration policy', () => {
  it('gives administrators every Builder capability', () => {
    const permissions = getBuilderPermissions(actor('1', 'admin'))

    expect(permissions.has('builder.content.write')).toBe(true)
    expect(permissions.has('builder.layout.write')).toBe(true)
    expect(permissions.has('builder.tokens.write')).toBe(true)
    expect(permissions.has('builder.history.restore')).toBe(true)
    expect(permissions.has('builder.comments.write')).toBe(true)
  })

  it('keeps global token writes separate from editor layout writes', () => {
    const editor = actor('2', 'editor')

    expect(canBuilder(editor, 'builder.layout.write', { type: 'option', key: 'site_footer_content' })).toBe(true)
    expect(canBuilder(editor, 'builder.tokens.read', { type: 'tokens', key: 'global' })).toBe(true)
    expect(canBuilder(editor, 'builder.tokens.write', { type: 'tokens', key: 'global' })).toBe(false)
  })

  it('limits contributors to their own draft post content', () => {
    const contributor = actor('7', 'contributor')

    expect(canBuilder(contributor, 'builder.content.write', postTarget)).toBe(true)
    expect(canBuilder(contributor, 'builder.layout.write', postTarget)).toBe(false)
    expect(canBuilder(contributor, 'builder.content.write', { ...postTarget, status: 'publish' })).toBe(false)
    expect(canBuilder(contributor, 'builder.content.write', { ...postTarget, ownerId: '8' })).toBe(false)
  })

  it('allows client content access without structural or comment access', () => {
    const client = actor('8', 'client')

    expect(canBuilder(client, 'builder.content.read', postTarget)).toBe(true)
    expect(canBuilder(client, 'builder.content.write', postTarget)).toBe(true)
    expect(canBuilder(client, 'builder.client.use', postTarget)).toBe(true)
    expect(canBuilder(client, 'builder.layout.write', postTarget)).toBe(false)
    expect(canBuilder(client, 'builder.comments.read', postTarget)).toBe(false)
  })

  it('permits content prop changes but rejects structural changes without layout permission', () => {
    const editor = actor('2', 'editor')
    const changedProps = {
      ...document,
      content: [
        { type: 'Heading', props: { title: 'Changed', level: 'h2' } },
        { type: 'Button', props: { label: 'Read', href: '/read', variant: 'primary' } },
      ],
    }
    const changedStructure = {
      ...changedProps,
      content: [{ type: 'Text', props: { text: 'Changed' } }],
    }

    expect(assertBuilderChange(document, changedProps, editor, 'editor', postTarget)).toEqual({ ok: true })
    expect(assertBuilderChange(document, changedStructure, actor('7', 'contributor'), 'editor', postTarget)).toMatchObject({
      ok: false,
      code: 'builder_layout_forbidden',
    })
  })

  it('enforces the client field allowlist and protects links and media URLs', () => {
    expect(getClientEditableFields('Heading')).toEqual(['title', 'align'])
    expect(getClientEditableFields('Button')).not.toContain('href')
    expect(getClientEditableFields('Image')).not.toContain('url')

    const client = actor('8', 'client')
    const changedAllowedField = {
      ...document,
      content: [
        { type: 'Heading', props: { title: 'Client title', level: 'h2' } },
        document.content[1],
      ],
    }
    const changedProtectedField = {
      ...document,
      content: [
        document.content[0],
        { type: 'Button', props: { label: 'Read', href: 'https://evil.test', variant: 'primary' } },
      ],
    }

    expect(assertBuilderChange(document, changedAllowedField, client, 'client', postTarget)).toEqual({ ok: true })
    expect(assertBuilderChange(document, changedProtectedField, client, 'client', postTarget)).toMatchObject({
      ok: false,
      code: 'builder_client_field_forbidden',
    })
  })
})
