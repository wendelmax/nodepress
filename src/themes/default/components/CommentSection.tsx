"use client"

import { useState } from "react"

interface Comment {
  commentId: number
  commentAuthor: string
  commentDate: string
  commentContent: string
}

interface CommentSectionProps {
  postId: number
  initialComments: Comment[]
}

export default function CommentSection({ postId, initialComments }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  
  // Form State
  const [authorName, setAuthorName] = useState("")
  const [authorEmail, setAuthorEmail] = useState("")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, authorName, authorEmail, content })
      })

      if (res.ok) {
        const newComment = await res.json()
        
        // Se o comentário voltou aprovado (ex: autor era admin), adiciona na lista
        if (newComment.commentApproved === '1') {
          setComments([...comments, newComment])
          setMessage({ type: 'success', text: 'Seu comentário foi publicado!' })
        } else {
          setMessage({ type: 'success', text: 'Seu comentário aguarda moderação.' })
        }

        // Limpar form
        setAuthorName("")
        setAuthorEmail("")
        setContent("")
      } else {
        setMessage({ type: 'error', text: 'Erro ao enviar comentário.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ marginTop: '50px', borderTop: '1px solid #f0f0f1', paddingTop: '30px' }}>
      <h3 style={{ fontSize: '22px', marginBottom: '20px' }}>
        {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
      </h3>

      {/* Lista de Comentários Aprovados */}
      {comments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
          {comments.map(c => (
            <div key={c.commentId} style={{ backgroundColor: '#fcfcfc', border: '1px solid #dcdcde', padding: '20px', borderRadius: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <strong style={{ fontSize: '15px' }}>{c.commentAuthor}</strong>
                <span style={{ margin: '0 8px', color: '#c3c4c7' }}>|</span>
                <span style={{ fontSize: '13px', color: '#646970' }}>{new Date(c.commentDate).toLocaleString()}</span>
              </div>
              <div style={{ lineHeight: '1.6', color: '#3c434a' }}>
                {c.commentContent}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulário de Envio */}
      <div style={{ backgroundColor: 'white', padding: '30px', border: '1px solid #c3c4c7', borderRadius: '3px' }}>
        <h4 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Leave a Reply</h4>

        {message && (
          <div style={{ 
            padding: '12px', 
            marginBottom: '20px', 
            backgroundColor: message.type === 'success' ? '#edfaef' : '#fcf0f1',
            borderLeft: `4px solid ${message.type === 'success' ? '#00a32a' : '#d63638'}` 
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 600 }}>Name *</label>
              <input 
                type="text" 
                required 
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #8c8f94', borderRadius: '3px' }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 600 }}>Email *</label>
              <input 
                type="email" 
                required 
                value={authorEmail}
                onChange={e => setAuthorEmail(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #8c8f94', borderRadius: '3px' }} 
              />
            </div>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: 600 }}>Comment *</label>
            <textarea 
              required 
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #8c8f94', borderRadius: '3px', resize: 'vertical' }} 
            />
          </div>

          <div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ 
                backgroundColor: '#2271b1', 
                color: 'white', 
                border: 'none', 
                padding: '10px 20px', 
                borderRadius: '3px', 
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                fontWeight: 600
              }}
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
