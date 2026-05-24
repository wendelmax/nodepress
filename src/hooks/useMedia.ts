"use client"

import { useState, useEffect } from "react"

export interface MediaAttachment {
  id: number
  postTitle: string
  postMimeType: string
  postDate: string
  guid: string
  author?: {
    displayName?: string
    userLogin: string
  }
}

export function useMedia() {
  const [mediaList, setMediaList] = useState<MediaAttachment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const fetchMedia = async (pageNum: number = 1) => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/media?page=${pageNum}`)
      const data = await res.json()
      if (pageNum === 1) {
        setMediaList(data.media || [])
      } else {
        setMediaList(prev => [...prev, ...(data.media || [])])
      }
      setHasMore(pageNum < (data.totalPages || 1))
      setPage(pageNum)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMedia(1)
  }, [])

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchMedia(page + 1)
    }
  }

  const uploadMedia = async (file: File) => {
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
    hasMore,
    loadMore,
    refreshMedia: () => fetchMedia(1)
  }
}

