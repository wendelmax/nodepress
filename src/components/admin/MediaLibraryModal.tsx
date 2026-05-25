"use client"

import { useState, useEffect } from "react"
import { UploadCloud, X, Check, Image as ImageIcon } from "lucide-react"

interface MediaLibraryModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (id: number, url: string) => void
}

export default function MediaLibraryModal({ isOpen, onClose, onSelect }: MediaLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library')
  const [images, setImages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<any | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const fetchImages = async () => {
    setIsLoading(true)
    try {
      // Fetching first page for now, can be extended with pagination or infinite scroll
      const res = await fetch('/api/media?page=1')
      const data = await res.json()
      if (data.posts) {
        setImages(data.posts)
      }
    } catch (err) {
      console.error("Failed to fetch media", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchImages()
    }
  }, [isOpen, activeTab])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', e.target.files[0])
      try {
        const res = await fetch('/api/media', { method: 'POST', body: formData })
        const data = await res.json()
        if (res.ok && data.id) {
          // Add to local state and switch to library tab to select it
          setImages([data, ...images])
          setSelectedImage(data)
          setActiveTab('library')
        } else {
          alert('Upload falhou.')
        }
      } catch (err) {
        alert('Erro no upload.')
      } finally {
        setIsUploading(false)
      }
    }
  }

  const handleConfirm = () => {
    if (selectedImage) {
      onSelect(selectedImage.id, selectedImage.guid)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6">
      <div className="bg-background-secondary border border-border w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background-tertiary">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ImageIcon size={20} className="text-primary" /> Biblioteca de Mídia
          </h2>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-white/5 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 border-b border-border/50 bg-background-tertiary">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'upload' ? 'border-primary text-primary-light' : 'border-transparent text-text-secondary hover:text-white'}`}
          >
            Fazer Upload
          </button>
          <button 
            onClick={() => setActiveTab('library')}
            className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'library' ? 'border-primary text-primary-light' : 'border-transparent text-text-secondary hover:text-white'}`}
          >
            Biblioteca de Mídia
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-background relative">
          {activeTab === 'upload' ? (
            <div className="h-full flex items-center justify-center">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/50 bg-white/[0.02] hover:bg-white/[0.05] rounded-3xl w-full max-w-lg p-12 cursor-pointer transition-all">
                <UploadCloud size={48} className="text-primary/60 mb-4" />
                <span className="text-lg font-bold text-white mb-2">
                  {isUploading ? 'Enviando...' : 'Solte arquivos para fazer upload'}
                </span>
                <span className="text-sm text-text-muted text-center max-w-sm">
                  ou clique para selecionar arquivos do seu computador. Tamanho máximo recomendado 2MB.
                </span>
                <input type="file" accept="image/*" className="hidden" disabled={isUploading} onChange={handleUpload} />
              </label>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center text-text-muted">Carregando mídia...</div>
              ) : images.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-2">
                  <ImageIcon size={32} className="opacity-50" />
                  <p>Nenhum item de mídia encontrado.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {images.map(img => {
                    const isSelected = selectedImage?.id === img.id
                    return (
                      <div 
                        key={img.id} 
                        onClick={() => setSelectedImage(img)}
                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer group transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background border-transparent' : 'border border-border hover:border-primary/50'}`}
                      >
                        <img 
                          src={img.guid} 
                          alt={img.postTitle} 
                          className={`w-full h-full object-cover transition-transform ${isSelected ? 'scale-105' : 'group-hover:scale-105'}`} 
                        />
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-primary text-white p-1 rounded-md shadow-md">
                            <Check size={14} strokeWidth={3} />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                          <p className="text-[10px] text-white/80 truncate">{img.postTitle}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border/50 bg-background-tertiary flex items-center justify-between">
          <div className="text-xs text-text-muted">
            {selectedImage ? `1 item selecionado` : `Nenhum item selecionado`}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-text hover:text-white border border-border bg-white/5 hover:bg-white/10 transition-colors">
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!selectedImage}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-primary-gradient text-white hover:shadow-neon disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Inserir na página
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
