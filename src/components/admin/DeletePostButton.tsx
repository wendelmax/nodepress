"use client"

import { usePosts } from "@/hooks/usePosts"
import { useRouter } from "next/navigation"

export default function DeletePostButton({ postId, force = false }: { postId: number; force?: boolean }) {
  const { deletePost } = usePosts()
  const router = useRouter()

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    const msg = force ? "Are you sure you want to permanently delete this item?" : "Move to trash?"
    
    if (confirm(msg)) {
      const success = await deletePost(postId, force)
      if (success) {
        router.refresh()
      } else {
        alert(force ? "Failed to delete post permanently" : "Failed to trash post")
      }
    }
  }

  return (
    <a 
      href="#" 
      onClick={handleDelete} 
      style={{ textDecoration: 'none', color: '#b32d2e', cursor: 'pointer' }}
    >
      {force ? 'Delete Permanently' : 'Trash'}
    </a>
  )
}
