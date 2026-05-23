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
        alert("Falha ao restaurar post.")
      }
    } catch (error) {
      console.error(error)
      alert("Erro ao restaurar post.")
    } finally {
      setIsRestoring(false)
    }
  }

  return (
    <button 
      onClick={handleRestore} 
      disabled={isRestoring}
      className="text-primary hover:text-primary-light bg-transparent border-none cursor-pointer font-medium p-0 text-xs transition-colors outline-none"
    >
      {isRestoring ? 'Restaurando...' : 'Restaurar'}
    </button>
  )
}
