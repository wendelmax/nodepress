"use client"

import { useState, useRef } from "react"
import { useMedia } from "@/hooks/useMedia"
import Image from "next/image"

export default function MediaLibraryPage() {
  const { mediaList, isLoading, isUploading, uploadMedia } = useMedia()
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        await uploadMedia(file)
      } else {
        alert("Please upload an image file.")
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type.startsWith('image/')) {
        await uploadMedia(file)
      } else {
        alert("Please upload an image file.")
      }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0' }}>Media Library</h1>
        <button 
          onClick={() => fileInputRef.current?.click()}
          style={{ border: '1px solid #2271b1', color: '#2271b1', padding: '4px 8px', cursor: 'pointer', borderRadius: '3px', fontSize: '13px', backgroundColor: '#f6f7f7' }}
        >
          Add New
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          style={{ display: 'none' }} 
        />
      </div>

      {/* Drag & Drop Area */}
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{ 
          border: `2px dashed ${dragActive ? '#2271b1' : '#c3c4c7'}`,
          backgroundColor: dragActive ? 'rgba(34, 113, 177, 0.05)' : 'white',
          padding: '40px',
          textAlign: 'center',
          marginBottom: '20px',
          borderRadius: '3px',
          transition: 'all 0.2s ease'
        }}
      >
        {isUploading ? (
          <p style={{ color: '#2271b1', fontSize: '18px', margin: 0 }}>Uploading...</p>
        ) : (
          <p style={{ color: '#646970', fontSize: '18px', margin: 0 }}>
            Drop files to upload <br/>
            <span style={{ fontSize: '13px' }}>or click &quot;Add New&quot;</span>
          </p>
        )}
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <p>Loading media...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
          {mediaList.map((media) => (
            <div 
              key={media.id} 
              style={{ 
                position: 'relative', 
                aspectRatio: '1', 
                border: '1px solid #c3c4c7', 
                backgroundColor: '#f0f0f1',
                boxShadow: '0 1px 1px rgba(0,0,0,.04)',
                cursor: 'pointer',
                overflow: 'hidden'
              }}
              title={media.postTitle}
            >
              <Image 
                src={media.guid} 
                alt={media.postTitle} 
                fill
                style={{ objectFit: 'cover' }}
              />
            </div>
          ))}
          {mediaList.length === 0 && (
            <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: '#646970', border: '1px solid #c3c4c7', backgroundColor: 'white' }}>
              No media items found.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
