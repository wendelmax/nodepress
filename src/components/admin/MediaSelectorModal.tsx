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
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        width: '80%',
        maxWidth: '900px',
        height: '80%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '4px',
        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid #c3c4c7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Select Media</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#646970' }}>&times;</button>
        </div>
        
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#f0f0f1' }}>
          {isLoading ? (
            <div>Loading media...</div>
          ) : mediaItems.length === 0 ? (
            <div>No media found. Upload some in the Media Library first.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
              {mediaItems.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => onSelect(item.guid, item.postTitle)}
                  style={{ 
                    border: '1px solid #c3c4c7', 
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    position: 'relative',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                  title={item.postTitle}
                >
                  {item.postMimeType.startsWith('image/') ? (
                    <Image src={item.guid} alt={item.postTitle} fill sizes="150px" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', wordBreak: 'break-all', padding: '10px' }}>📄<br/>{item.postTitle}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
