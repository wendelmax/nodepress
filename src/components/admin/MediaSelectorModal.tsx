"use client"

import { useState, useEffect } from "react"
import Image from "next/image"

interface MediaItem {
  id: number
  postTitle: string
  guid: string
  postMimeType: string
}

interface MediaSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (url: string, altText: string) => void
}

export default function MediaSelectorModal({ isOpen, onClose, onSelect }: MediaSelectorModalProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchMedia = async () => {
    await Promise.resolve()
    setIsLoading(true)
    try {
      const res = await fetch("/api/media")
      if (res.ok) {
        const data = await res.json()
        setMediaItems(data)
      }
    } catch (error) {
      console.error("Failed to fetch media", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => {
        fetchMedia()
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-surface-elevated w-full max-w-5xl h-[80vh] flex flex-col rounded-2xl shadow-soft border border-border overflow-hidden animate-fadeIn">
        
        <div className="px-6 py-4 border-b border-border bg-white/[0.02] flex justify-between items-center">
          <h2 className="m-0 text-lg font-bold text-text tracking-wide">Select Media</h2>
          <button 
            onClick={onClose} 
            className="bg-transparent border-none text-2xl cursor-pointer text-text-muted hover:text-white transition-colors"
          >
            &times;
          </button>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto bg-background">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-text-muted">
              <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></span>
              <p>Loading media...</p>
            </div>
          ) : mediaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted">
              <span className="text-4xl mb-3">🖼️</span>
              <p>No media found. Upload some in the Media Library first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {mediaItems.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => onSelect(item.guid, item.postTitle)}
                  className="group relative aspect-square rounded-xl border border-border bg-surface/50 cursor-pointer overflow-hidden hover:border-primary/50 hover:shadow-glow transition-all"
                  title={item.postTitle}
                >
                  {item.postMimeType.startsWith('image/') ? (
                    <Image 
                      src={item.guid} 
                      alt={item.postTitle} 
                      fill 
                      sizes="(max-width: 768px) 33vw, 20vw" 
                      className="object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-2 text-center break-all bg-white/5">
                      <span className="text-2xl mb-1">📄</span>
                      <span className="text-[10px] text-text-secondary line-clamp-2">{item.postTitle}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
