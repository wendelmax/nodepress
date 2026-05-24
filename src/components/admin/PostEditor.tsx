"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePosts } from "@/hooks/usePosts"
import { useTaxonomies } from "@/hooks/useTaxonomies"
import dynamic from 'next/dynamic'
import { Card } from "@/components/admin/Card"
import { GlassButton } from "@/components/admin/GlassButton"

const BlockEditor = dynamic(() => import('./BlockEditor'), { 
  ssr: false, 
  loading: () => <div className="h-[400px] border border-border rounded-2xl bg-white/[0.01] flex items-center justify-center text-xs text-text-muted">Carregando editor...</div> 
})

interface PostEditorProps {
  postId?: number;
  postType?: string;
  initialData?: {
    title: string;
    content: string;
    status: string;
    categories?: number[];
    tags?: number[];
    thumbnailId?: number | null;
    thumbnailUrl?: string | null;
    metaData?: Record<string, string>;
    postDate?: Date;
    postParent?: number | null;
  };
  fieldGroups?: any[];
}

export default function PostEditor({ postId, postType = 'post', initialData, fieldGroups = [] }: PostEditorProps) {
  const [title, setTitle] = useState(initialData?.title || "")
  const [content, setContent] = useState(initialData?.content || "")
  const [status, setStatus] = useState(initialData?.status || "publish")
  
  // Format initial date for datetime-local input (YYYY-MM-DDThh:mm)
  const initialDateStr = initialData?.postDate 
    ? new Date(initialData.postDate.getTime() - (initialData.postDate.getTimezoneOffset() * 60000)).toISOString().slice(0, 16)
    : ""
  const [postDate, setPostDate] = useState(initialDateStr)

  const [parentId, setParentId] = useState<number | null>(initialData?.postParent || null)
  const [availablePages, setAvailablePages] = useState<any[]>([])

  const [selectedCategories, setSelectedCategories] = useState<number[]>(initialData?.categories || [])
  const [selectedTags, setSelectedTags] = useState<number[]>(initialData?.tags || [])
  
  const [thumbnailId, setThumbnailId] = useState<number | null>(initialData?.thumbnailId || null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(initialData?.thumbnailUrl || null)
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false)

  const [revisions, setRevisions] = useState<any[]>([])
  const [isRestoring, setIsRestoring] = useState(false)

  const [customMeta, setCustomMeta] = useState<Record<string, string>>(initialData?.metaData || {})

  const { savePost, isSaving } = usePosts()
  const { terms: availableCategories } = useTaxonomies('category')
  const { terms: availableTags } = useTaxonomies('post_tag')
  
  const router = useRouter()
  const isEditing = !!postId

  useEffect(() => {
    if (isEditing) {
      fetch(`/api/posts/${postId}/revisions`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setRevisions(data)
          }
        })
        .catch(err => console.error("Failed to fetch revisions", err))
    }

    if (postType !== 'post') {
      fetch(`/api/posts?type=${postType}&per_page=100`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAvailablePages(data.filter(p => p.id !== postId))
          }
        })
        .catch(err => console.error("Failed to fetch parent candidates", err))
    }
  }, [postId, isEditing, postType])

  const handleRestore = async (revisionId: number) => {
    if (!confirm('Tem certeza que deseja restaurar esta revisão? As alterações não salvas serão perdidas.')) return
    
    setIsRestoring(true)
    try {
      const res = await fetch(`/api/posts/${postId}/revisions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId })
      })

      if (res.ok) {
        window.location.reload()
      } else {
        alert('Falha ao restaurar revisão.')
      }
    } catch (err) {
      alert('Erro ao restaurar revisão.')
    } finally {
      setIsRestoring(false)
    }
  }

  const handleSubmitForm = async (forcedStatus?: string) => {
    const finalStatus = forcedStatus || status
    
    const result = await savePost(postId, {
      title,
      content,
      status: finalStatus,
      type: postType,
      categories: selectedCategories,
      tags: selectedTags,
      thumbnailId,
      thumbnailUrl,
      metaData: customMeta,
      postDate: postDate ? new Date(postDate).toISOString() : undefined,
      parentId
    })

    if (result) {
      router.push(postType === 'page' ? "/admin/pages" : "/admin/posts")
      router.refresh()
    } else {
      alert(`Falha ao ${isEditing ? 'atualizar' : 'criar'} o ${postType === 'page' ? 'página' : 'post'}.`)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSubmitForm()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8 w-full">
      {/* ── Page Header Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6 mb-2">
        <div className="flex items-center gap-3">
          <Link href={postType === 'page' ? "/admin/pages" : "/admin/posts"} className="text-text-secondary hover:text-white transition-colors text-lg no-underline font-semibold leading-none">
            ←
          </Link>
          <h1 className="text-2xl font-bold text-text leading-tight">
            {isEditing ? `Editar ${postType === 'page' ? 'Página' : 'Post'}` : `Novo ${postType === 'page' ? 'Página' : 'Post'}`}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setStatus("draft"); handleSubmitForm("draft"); }}
            disabled={isSaving}
            className="h-10 px-5 rounded-xl bg-white/5 border border-border hover:bg-white/10 text-text-secondary hover:text-white font-medium text-xs transition-all cursor-pointer leading-none outline-none"
          >
            Salvar rascunho
          </button>
          
          <button
            type="submit"
            disabled={isSaving}
            className="h-10 px-6 rounded-xl bg-primary-gradient text-white hover:shadow-neon font-bold text-xs transition-all cursor-pointer leading-none outline-none border-none"
          >
            {isSaving ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Publicar')}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex flex-col xl:flex-row gap-8 items-start w-full">
        {/* Left Column (Main Editor, Custom Fields, SEO) */}
        <div className="flex-1 w-full flex flex-col gap-8">
          {/* Title Area */}
          <div className="w-full">
            <input 
              type="text" 
              placeholder="Adicione um título incrível..." 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-transparent text-4xl md:text-5xl font-semibold outline-none border-none text-text placeholder:text-text-muted leading-tight"
            />
          </div>

          {/* Block Editor */}
          <div className="rounded-2xl border border-border bg-surface-elevated overflow-hidden shadow-soft w-full">
            {/* Toolbar Header */}
            <div className="flex items-center gap-3 border-b border-border bg-white/[0.02] px-5 py-3.5">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Editor de Blocos</span>
              <div className="w-px h-4 bg-border/60 mx-1" />
              {/* Fake styling helper dots */}
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500/40" />
                <span className="w-2 h-2 rounded-full bg-yellow-500/40" />
                <span className="w-2 h-2 rounded-full bg-green-500/40" />
              </div>
              <div className="ml-auto">
                <Link href="/admin/settings/ai" className="px-3.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary-light hover:bg-primary/20 text-xs font-semibold transition-colors no-underline">
                  ✨ Escrever com IA
                </Link>
              </div>
            </div>
            {/* Write Area */}
            <div className="p-6 md:p-8 bg-transparent min-h-[400px]">
              <BlockEditor 
                value={content} 
                onChange={setContent} 
                placeholder="Comece a escrever ou digite / para escolher um bloco..."
              />
            </div>
          </div>

          {/* Render Custom Field Groups (ACF) */}
          {fieldGroups.filter(g => g.postType === postType).map(group => (
            <Card key={group.id} className="p-6 flex flex-col gap-5">
              <h2 className="text-lg font-semibold text-text flex items-center gap-2 leading-none">
                <span>📋</span> {group.title}
              </h2>
              <div className="flex flex-col gap-4">
                {group.fields.map((field: any) => (
                  <div key={field.name} className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-text-secondary">
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={customMeta[field.name] || ''}
                        onChange={(e) => setCustomMeta({ ...customMeta, [field.name]: e.target.value })}
                        className="w-full bg-white/[0.03] border border-border rounded-xl p-4 text-xs text-text outline-none focus:border-primary/50 transition-all resize-none min-h-[90px] font-sans"
                      />
                    ) : (
                      <input
                        type={field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text'}
                        value={customMeta[field.name] || ''}
                        onChange={(e) => setCustomMeta({ ...customMeta, [field.name]: e.target.value })}
                        className="w-full h-11 bg-white/[0.03] border border-border rounded-xl px-4 text-xs text-text outline-none focus:border-primary/50 transition-all"
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}

          {/* Render SEO Settings Box */}
          <Card className="p-6 flex flex-col gap-5">
            <h2 className="text-lg font-semibold text-text flex items-center gap-2 leading-none">
              <span>🔍</span> Configurações de SEO
            </h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-secondary">
                  Palavra-chave foco / Título SEO
                </label>
                <input
                  type="text"
                  value={customMeta['_seo_title'] || ''}
                  onChange={(e) => setCustomMeta({ ...customMeta, '_seo_title': e.target.value })}
                  className="w-full h-11 bg-white/[0.03] border border-border rounded-xl px-4 text-xs text-text outline-none focus:border-primary/50 transition-all"
                  placeholder={title || "Título do Post"}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-secondary">
                  Meta Description
                </label>
                <textarea
                  value={customMeta['_seo_description'] || ''}
                  onChange={(e) => setCustomMeta({ ...customMeta, '_seo_description': e.target.value })}
                  className="w-full bg-white/[0.03] border border-border rounded-xl p-4 text-xs text-text outline-none focus:border-primary/50 transition-all resize-none min-h-[70px] font-sans"
                  placeholder="Escreva uma descrição resumida para atrair cliques no Google..."
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column (Sidebar Settings Drawer) */}
        <div className="w-full xl:w-[320px] flex flex-col gap-6 shrink-0">
          {/* Summary / Publish Box */}
          <div className="rounded-2xl border border-border bg-white/[0.02] p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">Resumo</h3>
              <span className="text-text-muted text-xs">▼</span>
            </div>
            
            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Visibilidade:</span>
                <span className="font-semibold text-primary">Público</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Status:</span>
                <select 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value)} 
                  className="bg-white/5 border border-border rounded-lg text-text hover:text-white px-2.5 py-1.5 font-medium cursor-pointer outline-none text-xs transition-colors duration-150"
                >
                  <option value="publish">Publicado</option>
                  <option value="draft">Rascunho</option>
                  <option value="private">Privado</option>
                </select>
              </div>

              {postType !== 'post' && (
                <>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <span className="text-text-secondary">Página Pai:</span>
                    <select 
                      value={parentId || ''} 
                      onChange={(e) => setParentId(e.target.value ? parseInt(e.target.value) : null)} 
                      className="w-full bg-white/5 border border-border rounded-xl px-3 py-1.5 text-xs text-text outline-none focus:border-primary/40 transition-colors"
                    >
                      <option value="">(Sem pai)</option>
                      {availablePages.map(p => (
                        <option key={p.id} value={p.id}>{p.postTitle}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-2">
                    <span className="text-text-secondary">Template:</span>
                    <select 
                      value={customMeta['_np_template'] || 'default'} 
                      onChange={(e) => setCustomMeta({ ...customMeta, '_np_template': e.target.value })} 
                      className="w-full bg-white/5 border border-border rounded-xl px-3 py-1.5 text-xs text-text outline-none focus:border-primary/40 transition-colors"
                    >
                      <option value="default">Padrão</option>
                      <option value="full-width">Largura Total (Sem Sidebar)</option>
                      <option value="landing">Landing Page (Sem Header/Footer)</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="text-text-secondary">Data de Publicação:</span>
                <input 
                  type="datetime-local" 
                  value={postDate} 
                  onChange={(e) => setPostDate(e.target.value)}
                  className="w-full bg-white/5 border border-border rounded-xl px-3 py-1.5 text-xs text-text outline-none focus:border-primary/40 transition-colors"
                />
                <span className="text-[10px] text-text-muted leading-relaxed">
                  Deixe em branco para publicar imediatamente ou defina uma data futura para agendar.
                </span>
              </div>
            </div>
          </div>

          {/* Revisions Box */}
          {revisions.length > 0 && (
            <div className="rounded-2xl border border-border bg-white/[0.02] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-border/40 pb-2">
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">Revisões ({revisions.length})</h3>
                <span className="text-text-muted text-xs">▼</span>
              </div>
              <div className="max-h-[150px] overflow-y-auto flex flex-col gap-2.5">
                {revisions.map(rev => (
                  <div key={rev.id} className="flex justify-between items-center text-xs border-b border-border/20 last:border-none pb-2">
                    <span className="text-text-muted">{new Date(rev.postDate).toLocaleString('pt-BR')}</span>
                    <button 
                      type="button" 
                      disabled={isRestoring}
                      onClick={() => handleRestore(rev.id)}
                      className="text-primary hover:text-primary-light bg-transparent border-none cursor-pointer p-0 underline text-xs font-medium"
                    >
                      Restaurar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Featured Image Box */}
          <div className="rounded-2xl border border-border bg-white/[0.02] p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border/40 pb-2">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">Imagem Destacada</h3>
              <span className="text-text-muted text-xs">▼</span>
            </div>
            <div className="flex flex-col gap-3.5">
              {thumbnailUrl ? (
                <>
                  <img src={thumbnailUrl} alt="Destacada" className="w-full h-auto rounded-xl border border-border bg-white/[0.01]" />
                  <button 
                    type="button" 
                    onClick={() => { setThumbnailId(null); setThumbnailUrl(null); }}
                    className="text-danger hover:text-red-400 bg-transparent border-none cursor-pointer text-left p-0 text-xs font-semibold underline leading-none"
                  >
                    Remover imagem destacada
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-primary/40 rounded-2xl py-8 px-4 cursor-pointer text-center bg-white/[0.01] hover:bg-white/[0.03] transition-all">
                  <span className="text-3xl mb-2">🖼️</span>
                  <span className="text-xs font-semibold text-primary hover:text-primary-light">
                    {isUploadingThumbnail ? 'Carregando...' : 'Definir imagem destacada'}
                  </span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    disabled={isUploadingThumbnail}
                    onChange={async (e) => {
                      if (e.target.files && e.target.files[0]) {
                        setIsUploadingThumbnail(true)
                        const formData = new FormData()
                        formData.append('file', e.target.files[0])
                        try {
                          const res = await fetch('/api/media', { method: 'POST', body: formData })
                          const data = await res.json()
                          if (res.ok && data.id) {
                            setThumbnailId(data.id)
                            setThumbnailUrl(data.guid)
                          } else {
                            alert('Falha no upload.')
                          }
                        } catch (err) {
                          alert('Erro no upload.')
                        } finally {
                          setIsUploadingThumbnail(false)
                        }
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {postType === 'post' && (
            <>
              {/* Categories Box */}
              <div className="rounded-2xl border border-border bg-white/[0.02] p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="text-xs font-bold text-text uppercase tracking-wider">Categorias</h3>
                  <span className="text-text-muted text-xs">▼</span>
                </div>
                <div className="max-h-[150px] overflow-y-auto flex flex-col gap-2 p-1">
                  {availableCategories.length === 0 ? (
                    <span className="text-text-muted text-xs">Nenhuma categoria encontrada.</span>
                  ) : availableCategories.map(cat => (
                    <label key={cat.id} className="flex items-center gap-2.5 text-xs text-text-secondary hover:text-white cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedCategories.includes(cat.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedCategories([...selectedCategories, cat.id])
                          else setSelectedCategories(selectedCategories.filter(id => id !== cat.id))
                        }}
                        className="rounded bg-white/5 border border-border text-primary focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>

              {/* Tags Box */}
              <div className="rounded-2xl border border-border bg-white/[0.02] p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="text-xs font-bold text-text uppercase tracking-wider">Tags</h3>
                  <span className="text-text-muted text-xs">▼</span>
                </div>
                <div className="max-h-[150px] overflow-y-auto flex flex-col gap-2 p-1">
                  {availableTags.length === 0 ? (
                    <span className="text-text-muted text-xs">Nenhuma tag encontrada.</span>
                  ) : availableTags.map(tag => (
                    <label key={tag.id} className="flex items-center gap-2.5 text-xs text-text-secondary hover:text-white cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={selectedTags.includes(tag.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedTags([...selectedTags, tag.id])
                          else setSelectedTags(selectedTags.filter(id => id !== tag.id))
                        }}
                        className="rounded bg-white/5 border border-border text-primary focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  )
}
