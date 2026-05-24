"use client"

import { useState, useRef } from "react"
import { useMedia, MediaAttachment } from "@/hooks/useMedia"
import Image from "next/image"
import { Card } from "@/components/admin/Card"

export default function MediaLibraryPage() {
  const { mediaList, isLoading, isUploading, uploadMedia, deleteMedia, hasMore, loadMore } = useMedia()
  const [dragActive, setDragActive] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MediaAttachment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
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
        alert("Por favor, envie apenas arquivos de imagem.")
      }
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.type.startsWith('image/')) {
        await uploadMedia(file)
      } else {
        alert("Por favor, envie apenas arquivos de imagem.")
      }
    }
  }

  const handleCopyLink = (url: string) => {
    const fullUrl = `${window.location.origin}${url}`
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir permanentemente esta imagem? Esta ação não pode ser desfeita.")) {
      setIsDeleting(true)
      const success = await deleteMedia(id)
      setIsDeleting(false)
      if (success) {
        setSelectedMedia(null)
      } else {
        alert("Falha ao excluir a imagem da biblioteca.")
      }
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-2">
        <div>
          <h1 className="text-2xl font-bold text-text leading-none">Biblioteca de Mídia</h1>
          <p className="text-xs text-text-secondary mt-1.5">Faça upload, visualize e gerencie seus arquivos de mídia</p>
        </div>
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 bg-primary-gradient text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:shadow-neon transition-all duration-200"
        >
          <span className="text-base leading-none">+</span>
          <span>Adicionar Novo</span>
        </button>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      {/* ── Drag & Drop Area ── */}
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
          dragActive 
            ? 'border-primary bg-primary/5 shadow-glow scale-[1.01]' 
            : 'border-border bg-surface/30 hover:border-primary/30 hover:bg-surface-elevated/40'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-primary font-semibold text-sm">Carregando arquivo...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 text-xl shadow-glow text-primary-light">
              📤
            </div>
            <p className="text-text font-semibold text-sm">
              Arraste e solte arquivos aqui para fazer upload
            </p>
            <p className="text-text-muted text-[11px] mt-1.5">
              ou clique para selecionar um arquivo do seu computador
            </p>
          </div>
        )}
      </div>

      {/* ── Media Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {[...Array(12)].map((_, index) => (
            <div key={index} className="aspect-square rounded-2xl bg-surface/30 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {mediaList.map((media) => (
            <div 
              key={media.id} 
              onClick={() => setSelectedMedia(media)}
              className="group relative aspect-square rounded-2xl border border-white/5 bg-surface/40 overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-glow transition-all duration-300"
              title={media.postTitle}
            >
              <Image 
                src={media.guid} 
                alt={media.postTitle} 
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background-secondary/95 via-background-secondary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                <p className="text-xs font-semibold truncate text-text leading-snug">{media.postTitle}</p>
                <p className="text-[10px] text-text-secondary truncate mt-0.5 font-medium uppercase tracking-wider">{media.postMimeType.split('/')[1]}</p>
              </div>
            </div>
          ))}

          {mediaList.length === 0 && (
            <Card className="col-span-full py-16 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-2xl mb-3 text-text-muted">
                🖼️
              </div>
              <h3 className="text-text font-bold text-sm">Biblioteca Vazia</h3>
              <p className="text-text-muted text-xs mt-1.5 max-w-[280px]">Você ainda não enviou nenhuma imagem. Faça o upload do seu primeiro arquivo acima!</p>
            </Card>
          )}
        </div>
      )}
      
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button 
            onClick={loadMore}
            disabled={isLoading}
            className="bg-white/5 hover:bg-white/10 border border-border text-text-secondary hover:text-white px-6 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
          >
            {isLoading ? 'Carregando...' : 'Carregar mais imagens'}
          </button>
        </div>
      )}

      {/* ── Details Modal ── */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedMedia(null)}
        >
          <div 
            className="bg-surface-elevated border border-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-soft flex flex-col md:flex-row gap-6 p-6 relative max-h-[90vh] md:max-h-none overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button 
              onClick={() => setSelectedMedia(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 flex items-center justify-center text-sm font-semibold hover:text-white transition-all"
            >
              ✕
            </button>

            {/* Left Col - Preview */}
            <div className="w-full md:w-1/2 aspect-square relative rounded-2xl overflow-hidden border border-white/5 bg-background flex items-center justify-center flex-shrink-0">
              <Image 
                src={selectedMedia.guid} 
                alt={selectedMedia.postTitle}
                fill
                className="object-contain p-2"
              />
            </div>

            {/* Right Col - Details */}
            <div className="flex-1 flex flex-col gap-4">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-primary-light">Detalhes do Arquivo</span>
                <h3 className="text-text font-bold text-lg mt-1 break-all leading-tight">{selectedMedia.postTitle}</h3>
              </div>

              <div className="flex flex-col gap-2.5 text-xs border-y border-border/40 py-3.5">
                <div className="flex justify-between">
                  <span className="text-text-muted">Tipo MIME</span>
                  <span className="font-semibold text-text uppercase tracking-wider">{selectedMedia.postMimeType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Enviado em</span>
                  <span className="font-semibold text-text">{new Date(selectedMedia.postDate).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Autor</span>
                  <span className="font-semibold text-text">{selectedMedia.author?.displayName || selectedMedia.author?.userLogin || 'Administrador'}</span>
                </div>
                <div className="flex flex-col gap-1.5 mt-1.5">
                  <span className="text-text-muted">Link Permanente</span>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}${selectedMedia.guid}`} 
                      className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-text-secondary select-all font-mono leading-none focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-auto">
                <button
                  onClick={() => handleCopyLink(selectedMedia.guid)}
                  className={`w-full py-2.5 rounded-xl font-semibold text-xs leading-none transition-all duration-200 ${
                    copied 
                      ? 'bg-success/20 border border-success/30 text-success shadow-[0_0_12px_rgba(34,197,94,0.15)]' 
                      : 'bg-primary-gradient text-white hover:shadow-neon'
                  }`}
                >
                  {copied ? '✓ Link Copiado!' : 'Copiar URL do Arquivo'}
                </button>

                <button
                  onClick={() => handleDelete(selectedMedia.id)}
                  disabled={isDeleting}
                  className="w-full bg-white/5 border border-danger/20 text-danger hover:bg-danger/10 hover:border-danger/30 py-2.5 rounded-xl font-semibold text-xs leading-none transition-all duration-200 disabled:opacity-50"
                >
                  {isDeleting ? 'Excluindo...' : 'Excluir Permanentemente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
