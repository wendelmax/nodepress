"use client"

import { useState } from "react"

export function usePosts() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchPost = async (id: number) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/posts/${id}`)
      if (res.ok) {
        return await res.json()
      }
      return null
    } catch (error) {
      console.error("Failed to fetch post", error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const savePost = async (
    id: number | undefined, 
    data: { title: string; content: string; status: string; type?: string; categories?: number[]; tags?: number[]; thumbnailId?: number | null; thumbnailUrl?: string | null; metaData?: Record<string, string>; postDate?: string; parentId?: number | null }
  ) => {
    setIsSaving(true)
    try {
      const url = id ? `/api/posts/${id}` : "/api/posts"
      const method = id ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })

      if (res.ok) {
        return await res.json()
      }
      return null
    } catch (error) {
      console.error("Failed to save post", error)
      return null
    } finally {
      setIsSaving(false)
    }
  }

  const deletePost = async (id: number, force: boolean = false) => {
    try {
      const res = await fetch(`/api/posts/${id}?force=${force}`, {
        method: "DELETE"
      })
      return res.ok
    } catch (error) {
      console.error("Failed to delete post", error)
      return false
    }
  }

  return {
    isLoading,
    isSaving,
    fetchPost,
    savePost,
    deletePost
  }
}
