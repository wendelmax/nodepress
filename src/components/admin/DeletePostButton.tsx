"use client"

import { usePosts } from "@/hooks/usePosts"
import { useRouter } from "next/navigation"

export default function DeletePostButton({ postId, force = false }: { postId: number; force?: boolean }) {
  const { deletePost } = usePosts()
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    const msg = force ? "Tem certeza de que deseja excluir este item permanentemente?" : "Mover para a lixeira?"
    
    if (confirm(msg)) {
      const success = await deletePost(postId, force)
      if (success) {
        router.refresh()
      } else {
        alert(force ? "Falha ao excluir o post permanentemente" : "Falha ao mover para a lixeira")
      }
    }
  }

  return (
    <button 
      onClick={handleDelete} 
      className="text-danger hover:text-red-400 bg-transparent border-none cursor-pointer font-medium p-0 text-xs transition-colors outline-none"
    >
      {force ? 'Excluir Permanentemente' : 'Lixeira'}
    </button>
  )
}
