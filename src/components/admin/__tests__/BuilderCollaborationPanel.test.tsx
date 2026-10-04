import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import BuilderCollaborationPanel from '../BuilderCollaborationPanel'

const target = { type: 'post' as const, key: '42' }

describe('BuilderCollaborationPanel', () => {
  it('shows version and conflict state without changing the editor document', () => {
    const markup = renderToStaticMarkup(
      <BuilderCollaborationPanel
        target={target}
        version={3}
        capabilities={['builder.history.read', 'builder.comments.read']}
        conflict="A versão mudou enquanto você editava."
        revisions={[]}
        comments={[]}
        onReload={vi.fn()}
        onRestore={vi.fn()}
        onResolveComment={vi.fn()}
        onCreateComment={vi.fn()}
      />,
    )

    expect(markup).toContain('Versão colaborativa 3')
    expect(markup).toContain('A versão mudou enquanto você editava.')
    expect(markup).toContain('Histórico')
    expect(markup).not.toContain('Restaurar esta revisão')
  })

  it('does not expose history or comments controls without capabilities', () => {
    const markup = renderToStaticMarkup(
      <BuilderCollaborationPanel
        target={target}
        version={1}
        capabilities={[]}
        revisions={[]}
        comments={[]}
        onReload={vi.fn()}
        onRestore={vi.fn()}
        onResolveComment={vi.fn()}
        onCreateComment={vi.fn()}
      />,
    )

    expect(markup).not.toContain('Histórico')
    expect(markup).not.toContain('Comentários')
  })
})
