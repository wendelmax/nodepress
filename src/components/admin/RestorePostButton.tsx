"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function RestorePostButton({ postId }: { postId: number }) {
  const [isRestoring, setIsRestoring] = useState(false)
  const router = useRouter()

  const handleRestore = async () => {
    setIsRestoring(true)
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" })
      })

      if (res.ok) {
        router.refresh()
      } else {
        alert("Failed to restore post.")
      }
    } catch (error) {
      console.error(error)
      alert("Error restoring post.")
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <button 
      onClick={handleRestore} 
      disabled={isRestoring}
      style={{ 
        color: '#2271b1', 
        background: 'none', 
        border: 'none', 
        padding: 0, 
        cursor: isRestoring ? 'not-allowed' : 'pointer',
        fontSize: '13px'
      }}
    >
      {isRestoring ? 'Restoring...' : 'Restore'}
    </button>
  )
}
