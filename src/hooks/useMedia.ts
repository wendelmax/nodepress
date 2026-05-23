"use client"

import { useState, useCallback, useEffect } from "react"

export interface MediaAttachment {
  id: number
  postTitle: string
  postMimeType: string
  postDate: string
  guid: string
  author: {
    displayName: string
    userLogin: string
  }
}

export function useMedia() {
  const [mediaList, setMediaList] = useState<MediaAttachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)

  const fetchMedia = useCallback(async () => {
    await Promise.resolve()
    setIsLoading(true)
    try {
      const res = await fetch("/api/media")
      const data = await res.json()
      if (Array.isArray(data)) {
        setMediaList(data)
      }
    } catch (error) {
      console.error("Failed to fetch media", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchMedia()
    })
  }, [fetchMedia])

  const uploadMedia = async (file: File): Promise<MediaAttachment | null> => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch("/api/media", {
        method: "POST",
        body: formData,
      })
      
      if (res.ok) {
        const newAttachment = await res.json()
        setMediaList(prev => [newAttachment, ...prev])
        return newAttachment
      }
      return null
    } catch (error) {
      console.error("Failed to upload media", error)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const deleteMedia = async (id: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/media?id=${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setMediaList(prev => prev.filter(item => item.id !== id))
        return true
      }
      return false
    } catch (error) {
      console.error("Failed to delete media", error)
      return false
    }
  }

  return {
    mediaList,
    isLoading,
    isUploading,
    uploadMedia,
    deleteMedia,
    refreshMedia: fetchMedia
  }
}

