"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { usePosts } from "@/hooks/usePosts"
import { useTaxonomies } from "@/hooks/useTaxonomies"
import dynamic from 'next/dynamic'

const BlockEditor = dynamic(() => import('./BlockEditor'), { ssr: false, loading: () => <div style={{ height: '400px', border: '1px solid #ccc', padding: '20px' }}>Loading editor...</div> })

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
  }, [postId, isEditing])

  const handleRestore = async (revisionId: number) => {
    if (!confirm('Are you sure you want to restore this revision? Your current unsaved changes will be lost.')) return
    
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
        alert('Failed to restore revision.')
      }
    } catch (err) {
      alert('Error restoring revision.')
    } finally {
      setIsRestoring(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await savePost(postId, {
      title,
      content,
      status,
      type: postType,
      categories: selectedCategories,
      tags: selectedTags,
      thumbnailId,
      thumbnailUrl,
      metaData: customMeta,
      postDate: postDate ? new Date(postDate).toISOString() : undefined
    })

    if (result) {
      router.push(postType === 'page' ? "/admin/edit?post_type=page" : "/admin/edit")
      router.refresh()
    } else {
      alert(`Failed to ${isEditing ? 'update' : 'create'} ${postType}.`)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0', marginBottom: '20px' }}>
        {isEditing ? `Edit ${postType === 'page' ? 'Page' : 'Post'}` : `Add New ${postType === 'page' ? 'Page' : 'Post'}`}
      </h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '15px' }}>
            <input 
              type="text" 
              placeholder="Add title" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', fontSize: '20px', border: '1px solid #c3c4c7', borderRadius: '3px' }}
            />
          </div>
          <div style={{ backgroundColor: 'white' }}>
            <BlockEditor 
              value={content} 
              onChange={setContent} 
              placeholder="Start writing or type / to choose a block"
            />
          </div>

          {/* Render Custom Field Groups */}
          {fieldGroups.filter(g => g.postType === postType).map(group => (
            <div key={group.id} style={{ backgroundColor: 'white', border: '1px solid #c3c4c7', padding: '15px', marginTop: '20px', boxShadow: '0 1px 1px rgba(0,0,0,.04)' }}>
              <h2 style={{ fontSize: '14px', margin: '0 0 15px 0', borderBottom: '1px solid #f0f0f1', paddingBottom: '8px' }}>
                {group.title}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {group.fields.map((field: any) => (
                  <div key={field.name}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px', color: '#2c3338' }}>
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={customMeta[field.name] || ''}
                        onChange={(e) => setCustomMeta({ ...customMeta, [field.name]: e.target.value })}
                        style={{ width: '100%', padding: '8px', border: '1px solid #8c8f94', borderRadius: '3px', minHeight: '80px', fontFamily: 'inherit' }}
                      />
                    ) : (
                      <input
                        type={field.type === 'url' ? 'url' : field.type === 'number' ? 'number' : 'text'}
                        value={customMeta[field.name] || ''}
                        onChange={(e) => setCustomMeta({ ...customMeta, [field.name]: e.target.value })}
                        style={{ width: '100%', padding: '8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Render SEO Settings Box */}
          <div style={{ backgroundColor: 'white', border: '1px solid #c3c4c7', padding: '15px', marginTop: '20px', boxShadow: '0 1px 1px rgba(0,0,0,.04)' }}>
            <h2 style={{ fontSize: '14px', margin: '0 0 15px 0', borderBottom: '1px solid #f0f0f1', paddingBottom: '8px' }}>
              SEO Settings
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px', color: '#2c3338' }}>
                  SEO Title
                </label>
                <input
                  type="text"
                  value={customMeta['_seo_title'] || ''}
                  onChange={(e) => setCustomMeta({ ...customMeta, '_seo_title': e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                  placeholder={title || "Post Title"}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px', color: '#2c3338' }}>
                  Meta Description
                </label>
                <textarea
                  value={customMeta['_seo_description'] || ''}
                  onChange={(e) => setCustomMeta({ ...customMeta, '_seo_description': e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #8c8f94', borderRadius: '3px', minHeight: '60px', fontFamily: 'inherit' }}
                  placeholder="Optimized description for search engines..."
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Publish Box */}
          <div style={{ backgroundColor: 'white', border: '1px solid #c3c4c7', padding: '12px' }}>
            <h2 style={{ fontSize: '14px', margin: '0 0 10px 0', borderBottom: '1px solid #f0f0f1', paddingBottom: '8px' }}>Publish</h2>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: '4px', border: '1px solid #8c8f94', borderRadius: '3px' }}>
                <option value="publish">Publish</option>
                <option value="draft">Draft</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>Publish Date</label>
              <input 
                type="datetime-local" 
                value={postDate} 
                onChange={(e) => setPostDate(e.target.value)}
                style={{ width: '100%', padding: '4px', border: '1px solid #8c8f94', borderRadius: '3px', fontSize: '13px' }}
              />
              <span style={{ fontSize: '11px', color: '#646970', display: 'block', marginTop: '4px' }}>
                Leave empty to publish immediately, or set a future date to schedule.
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f0f0f1', paddingTop: '10px' }}>
              <button 
                type="submit" 
                disabled={isSaving}
                style={{ backgroundColor: '#2271b1', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '3px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                {isSaving ? 'Saving...' : (isEditing ? 'Update' : 'Publish')}
              </button>
            </div>
          </div>

          {/* Revisions Box */}
          {revisions.length > 0 && (
            <div style={{ backgroundColor: 'white', border: '1px solid #c3c4c7', padding: '12px' }}>
              <h2 style={{ fontSize: '14px', margin: '0 0 10px 0', borderBottom: '1px solid #f0f0f1', paddingBottom: '8px' }}>
                Revisions ({revisions.length})
              </h2>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px' }}>
                  {revisions.map(rev => (
                    <li key={rev.id} style={{ marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f0f0f1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ color: '#646970' }}>
                        {new Date(rev.postDate).toLocaleString()}
                      </div>
                      <button 
                        type="button" 
                        disabled={isRestoring}
                        onClick={() => handleRestore(rev.id)}
                        style={{ color: '#2271b1', background: 'none', border: 'none', cursor: isRestoring ? 'not-allowed' : 'pointer', padding: 0, textDecoration: 'underline', fontSize: '13px' }}>
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Featured Image Box */}
          <div style={{ backgroundColor: 'white', border: '1px solid #c3c4c7', padding: '12px' }}>
            <h2 style={{ fontSize: '14px', margin: '0 0 10px 0', borderBottom: '1px solid #f0f0f1', paddingBottom: '8px' }}>Featured Image</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {thumbnailUrl ? (
                <>
                  <img src={thumbnailUrl} alt="Featured" style={{ width: '100%', height: 'auto', border: '1px solid #ddd', borderRadius: '3px' }} />
                  <button 
                    type="button" 
                    onClick={() => { setThumbnailId(null); setThumbnailUrl(null); }}
                    style={{ color: '#d63638', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: '13px', textDecoration: 'underline' }}
                  >
                    Remove featured image
                  </button>
                </>
              ) : (
                <>
                  <label style={{ display: 'block', color: '#2271b1', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px' }}>
                    {isUploadingThumbnail ? 'Uploading...' : 'Set featured image'}
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
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
                              alert('Upload failed.')
                            }
                          } catch (err) {
                            alert('Error uploading featured image.')
                          } finally {
                            setIsUploadingThumbnail(false)
                          }
                        }
                      }}
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          {postType === 'post' && (
            <>
              {/* Categories Box */}
              <div style={{ backgroundColor: 'white', border: '1px solid #c3c4c7', padding: '12px' }}>
                <h2 style={{ fontSize: '14px', margin: '0 0 10px 0', borderBottom: '1px solid #f0f0f1', paddingBottom: '8px' }}>Categories</h2>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '8px', backgroundColor: '#fcfcfc' }}>
                  {availableCategories.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#646970' }}>No categories found. Create one in Categories menu.</span>
                  ) : availableCategories.map(cat => (
                    <div key={cat.id} style={{ marginBottom: '4px' }}>
                      <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedCategories.includes(cat.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCategories([...selectedCategories, cat.id])
                            else setSelectedCategories(selectedCategories.filter(id => id !== cat.id))
                          }}
                        />
                        {cat.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags Box */}
              <div style={{ backgroundColor: 'white', border: '1px solid #c3c4c7', padding: '12px' }}>
                <h2 style={{ fontSize: '14px', margin: '0 0 10px 0', borderBottom: '1px solid #f0f0f1', paddingBottom: '8px' }}>Tags</h2>
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '8px', backgroundColor: '#fcfcfc' }}>
                  {availableTags.length === 0 ? (
                    <span style={{ fontSize: '12px', color: '#646970' }}>No tags found. Create one in Tags menu.</span>
                  ) : availableTags.map(tag => (
                    <div key={tag.id} style={{ marginBottom: '4px' }}>
                      <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedTags.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTags([...selectedTags, tag.id])
                            else setSelectedTags(selectedTags.filter(id => id !== tag.id))
                          }}
                        />
                        {tag.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  )
}

