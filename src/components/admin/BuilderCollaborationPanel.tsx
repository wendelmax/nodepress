"use client"

import { useState } from 'react'
import type { BuilderPermission, BuilderTargetRef } from '@/modules/builder-collaboration/domain'

export interface BuilderRevisionSummary {
  id: string
  version: number
  note?: string
  createdById: string
  createdAt: string | Date
}

export interface BuilderCommentSummary {
  id: string
  body: string
  status: 'open' | 'resolved'
  createdById: string
  createdAt: string | Date
}

export interface BuilderCollaborationPanelProps {
  target: BuilderTargetRef
  version: number
  capabilities: readonly BuilderPermission[] | readonly string[]
  revisions: readonly BuilderRevisionSummary[]
  comments: readonly BuilderCommentSummary[]
  conflict?: string | null
  onReload: () => void | Promise<void>
  onRestore: (revisionId: string) => void | Promise<void>
  onResolveComment: (commentId: string, status: 'open' | 'resolved') => void | Promise<void>
  onCreateComment: (body: string) => void | Promise<void>
}

function hasCapability(capabilities: readonly string[], capability: BuilderPermission): boolean {
  return capabilities.includes(capability)
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleString('pt-BR')
}

export default function BuilderCollaborationPanel({
  target,
  version,
  capabilities,
  revisions,
  comments,
  conflict,
  onReload,
  onRestore,
  onResolveComment,
  onCreateComment,
}: BuilderCollaborationPanelProps) {
  const [commentBody, setCommentBody] = useState('')
  const canHistory = hasCapability(capabilities, 'builder.history.read')
  const canRestore = hasCapability(capabilities, 'builder.history.restore')
  const canReadComments = hasCapability(capabilities, 'builder.comments.read')
  const canWriteComments = hasCapability(capabilities, 'builder.comments.write')

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = commentBody.trim()
    if (!body) return
    await onCreateComment(body)
    setCommentBody('')
  }

  return (
    <section
      className="mt-3 rounded-xl border border-border bg-surface/70 p-4 text-xs text-text"
      data-builder-target={`${target.type}:${target.key}`}
      aria-label="Colaboração do Builder"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">Versão colaborativa {version}</p>
          <p className="mt-1 text-text-muted">Alterações são protegidas por controle de versão e concorrência.</p>
        </div>
        <button
          type="button"
          onClick={() => void onReload()}
          className="rounded-lg border border-border px-3 py-2 font-medium text-text-secondary hover:border-primary/50 hover:text-text"
        >
          Atualizar estado
        </button>
      </div>

      {conflict && (
        <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-200" role="alert">
          {conflict}
        </div>
      )}

      {(canHistory || canReadComments) && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {canHistory && (
            <div>
              <h3 className="font-semibold">Histórico</h3>
              {revisions.length === 0 ? (
                <p className="mt-2 text-text-muted">Nenhuma revisão salva ainda.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {revisions.map((revision) => (
                    <li key={revision.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                      <span>
                        v{revision.version} · {formatDate(revision.createdAt)}
                        {revision.note ? ` · ${revision.note}` : ''}
                      </span>
                      {canRestore && (
                        <button
                          type="button"
                          onClick={() => void onRestore(revision.id)}
                          className="font-medium text-primary hover:text-primary-light"
                        >
                          Restaurar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {canReadComments && (
            <div>
              <h3 className="font-semibold">Comentários</h3>
              {comments.length === 0 ? (
                <p className="mt-2 text-text-muted">Nenhum comentário privado.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {comments.map((comment) => (
                    <li key={comment.id} className="rounded-lg border border-border/60 px-3 py-2">
                      <p className={comment.status === 'resolved' ? 'text-text-muted line-through' : 'text-text'}>{comment.body}</p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-text-muted">
                        <span>{formatDate(comment.createdAt)}</span>
                        {canWriteComments && (
                          <button
                            type="button"
                            onClick={() => void onResolveComment(comment.id, comment.status === 'resolved' ? 'open' : 'resolved')}
                            className="text-primary hover:text-primary-light"
                          >
                            {comment.status === 'resolved' ? 'Reabrir' : 'Resolver'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {canWriteComments && (
                <form className="mt-3 space-y-2" onSubmit={(event) => void submitComment(event)}>
                  <label className="sr-only" htmlFor="builder-comment">Novo comentário</label>
                  <textarea
                    id="builder-comment"
                    value={commentBody}
                    onChange={(event) => setCommentBody(event.target.value)}
                    placeholder="Adicionar comentário privado"
                    className="min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary/50"
                  />
                  <button type="submit" className="rounded-lg bg-primary px-3 py-2 font-semibold text-white hover:bg-primary/90">
                    Comentar
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
