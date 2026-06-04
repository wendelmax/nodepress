"use client"

import { useState, useEffect } from "react"
import { MessageSquare, MessageCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { LoadingSpinner } from "@/components/admin/SettingsUI"

interface Comment {
  commentId: number
  commentPostId: number
  commentAuthor: string
  commentAuthorEmail: string
  commentDate: string
  commentContent: string
  commentApproved: string // '1'=approved, '0'=pending, 'spam'=spam
  post: { id: number; postTitle: string; postName: string }
}

function StatusBadge({ approved }: { approved: string }) {
  if (approved === '1') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 border border-success/20 text-success">
      ● Aprovado
    </span>
  )
  if (approved === 'spam') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger/10 border border-danger/20 text-danger">
      ⚠ Spam
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
      ○ Pendente
    </span>
  )
}

interface CommentsResponse {
  comments: Comment[]
  total: number
}

export default function CommentsManager() {
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchComments = async () => {
    setIsLoading(true)
    const res = await fetch("/api/comments?per_page=200")
    if (res.ok) {
      const data = await res.json() as CommentsResponse
      setComments(data.comments || [])
      setTotal(data.total || 0)
    }
    setIsLoading(false)
  }

  useEffect(() => { Promise.resolve().then(fetchComments) }, [])

  const handleStatusChange = async (id: number, status: string) => {
    const res = await fetch(`/api/comments/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    if (res.ok) setComments(comments.map(c => c.commentId === id ? { ...c, commentApproved: status } : c))
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja apagar permanentemente este comentário?")) return
    const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' })
    if (res.ok) setComments(comments.filter(c => c.commentId !== id))
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/40 pb-6 mb-8">
        <MessageSquare size={24} className="text-primary-light" />
        <h1 className="text-2xl font-bold text-text leading-none">Comentários</h1>
      </div>
      <p className="text-xs text-text-secondary mt-1.5">
        {total} comentário{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}.
        </p>

      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-border rounded-2xl bg-surface-elevated text-text-muted">
          <MessageCircle size={40} className="opacity-30 mb-4" />
          <p>Nenhum comentário encontrado para esta busca.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {comments.map(comment => (
            <div
              key={comment.commentId}
              className={`p-4 rounded-2xl border transition-all duration-150 ${
                comment.commentApproved === '0'
                  ? 'border-yellow-500/20 bg-yellow-500/[0.03]'
                  : comment.commentApproved === 'spam'
                  ? 'border-danger/20 bg-danger/[0.03]'
                  : 'border-border bg-surface/40'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Author */}
                <div className="flex items-start gap-3 sm:w-48 flex-shrink-0">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 font-bold text-sm text-primary-light">
                    {comment.commentAuthor.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-text">{comment.commentAuthor}</div>
                    <a href={`mailto:${comment.commentAuthorEmail}`} className="text-[10px] text-primary-light hover:underline truncate block max-w-[120px]">
                      {comment.commentAuthorEmail}
                    </a>
                    <div className="mt-1.5">
                      <StatusBadge approved={comment.commentApproved} />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">{comment.commentContent}</p>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 mt-2.5">
                    {comment.post ? (
                      <Link href={`/${comment.post.postName}`} className="text-[10px] text-text-muted hover:text-primary-light transition-colors">
                        Em: <span className="font-semibold">{comment.post.postTitle}</span>
                      </Link>
                    ) : (
                      <span className="text-[10px] text-text-muted">(Post apagado)</span>
                    )}
                    <span className="text-[10px] text-text-muted">
                      {new Date(comment.commentDate).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-border/30">
                    {comment.commentApproved === '1' ? (
                      <button
                        onClick={() => handleStatusChange(comment.commentId, '0')}
                        className="text-[10px] font-semibold text-text-muted hover:text-danger transition-colors"
                      >
                        Reprovar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(comment.commentId, '1')}
                        className="text-[10px] font-semibold text-success hover:text-success/70 transition-colors"
                      >
                        Aprovar
                      </button>
                    )}
                    <span className="text-border">·</span>
                    <button
                      onClick={() => handleStatusChange(comment.commentId, 'spam')}
                      className="text-[10px] font-semibold text-text-muted hover:text-danger transition-colors"
                    >
                      Spam
                    </button>
                    <span className="text-border">·</span>
                    <button
                      onClick={() => handleDelete(comment.commentId)}
                      className="text-[10px] font-semibold text-danger hover:text-danger/70 transition-colors"
                    >
                      Apagar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
