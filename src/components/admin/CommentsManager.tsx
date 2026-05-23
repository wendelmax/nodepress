"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

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

export default function CommentsManager() {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchComments = async () => {
    await Promise.resolve()
    setIsLoading(true)
    const res = await fetch("/api/comments")
    if (res.ok) {
      const data = await res.json()
      setComments(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchComments()
    })
  }, [])

  const handleStatusChange = async (id: number, status: string) => {
    const res = await fetch(`/api/comments/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })

    if (res.ok) {
      setComments(comments.map(c => c.commentId === id ? { ...c, commentApproved: status } : c))
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this comment?")) return
    const res = await fetch(`/api/comments/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setComments(comments.filter(c => c.commentId !== id))
    }
  }

  if (isLoading) return <div style={{ padding: '20px' }}>Loading comments...</div>

  return (
    <div>
      <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0', marginBottom: '20px' }}>
        Comments
      </h1>

      {comments.length === 0 ? (
        <div style={{ backgroundColor: 'white', padding: '20px', border: '1px solid #c3c4c7', borderRadius: '3px' }}>
          No comments found.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #c3c4c7', boxShadow: '0 1px 1px rgba(0,0,0,.04)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #c3c4c7' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 400, color: '#2c3338' }}>Author</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 400, color: '#2c3338' }}>Comment</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 400, color: '#2c3338' }}>In Response To</th>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 400, color: '#2c3338' }}>Submitted On</th>
            </tr>
          </thead>
          <tbody>
            {comments.map((comment) => (
              <tr 
                key={comment.commentId} 
                style={{ 
                  borderBottom: '1px solid #f0f0f1',
                  backgroundColor: comment.commentApproved === '0' ? '#fdf2e8' : (comment.commentApproved === 'spam' ? '#fcf0f1' : 'transparent')
                }}
              >
                <td style={{ padding: '10px', verticalAlign: 'top', width: '20%' }}>
                  <strong>{comment.commentAuthor}</strong><br/>
                  <a href={`mailto:${comment.commentAuthorEmail}`} style={{ color: '#2271b1', textDecoration: 'none', fontSize: '13px' }}>{comment.commentAuthorEmail}</a>
                </td>
                <td style={{ padding: '10px', verticalAlign: 'top', width: '40%' }}>
                  <p style={{ margin: '0 0 10px 0', color: '#3c434a' }}>{comment.commentContent}</p>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
                    {comment.commentApproved === '1' ? (
                      <button onClick={() => handleStatusChange(comment.commentId, '0')} style={{ background: 'none', border: 'none', color: '#d63638', cursor: 'pointer', padding: 0 }}>Unapprove</button>
                    ) : (
                      <button onClick={() => handleStatusChange(comment.commentId, '1')} style={{ background: 'none', border: 'none', color: '#00a32a', cursor: 'pointer', padding: 0 }}>Approve</button>
                    )}
                    <span style={{ color: '#c3c4c7' }}>|</span>
                    <button onClick={() => handleStatusChange(comment.commentId, 'spam')} style={{ background: 'none', border: 'none', color: '#d63638', cursor: 'pointer', padding: 0 }}>Spam</button>
                    <span style={{ color: '#c3c4c7' }}>|</span>
                    <button onClick={() => handleDelete(comment.commentId)} style={{ background: 'none', border: 'none', color: '#d63638', cursor: 'pointer', padding: 0 }}>Trash</button>
                  </div>
                </td>
                <td style={{ padding: '10px', verticalAlign: 'top', width: '20%' }}>
                  {comment.post ? (
                    <Link href={`/${comment.post.postName}`} style={{ color: '#2271b1', textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
                      {comment.post.postTitle}
                    </Link>
                  ) : (
                    <span style={{ color: '#646970', fontSize: '13px' }}>(Post deleted)</span>
                  )}
                </td>
                <td style={{ padding: '10px', verticalAlign: 'top', width: '20%', fontSize: '13px', color: '#646970' }}>
                  {new Date(comment.commentDate).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
