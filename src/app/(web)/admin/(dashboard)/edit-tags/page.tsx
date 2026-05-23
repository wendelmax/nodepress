"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTaxonomies } from "@/hooks/useTaxonomies"

export default function EditTagsPage() {
  const searchParams = useSearchParams()
  const taxonomy = (searchParams.get('taxonomy') as 'category' | 'post_tag') || 'category'
  
  const { terms, isLoading, isSaving, createTerm } = useTaxonomies(taxonomy)

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [description, setDescription] = useState("")

  const isCategory = taxonomy === 'category'
  const title = isCategory ? "Categories" : "Tags"
  const singular = isCategory ? "Category" : "Tag"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const success = await createTerm(name, slug, description)
    if (success) {
      setName("")
      setSlug("")
      setDescription("")
    } else {
      alert("Failed to add term.")
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0', marginBottom: '20px' }}>{title}</h1>
      
      <div style={{ display: 'flex', gap: '40px' }}>
        {/* Left Side: Form */}
        <div style={{ width: '300px' }}>
          <h2 style={{ fontSize: '14px', marginBottom: '15px' }}>Add New {singular}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '4px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
              />
              <p style={{ fontSize: '12px', color: '#646970', margin: '4px 0' }}>The name is how it appears on your site.</p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px' }}>Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                style={{ width: '100%', padding: '4px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
              />
              <p style={{ fontSize: '12px', color: '#646970', margin: '4px 0' }}>The description is not prominent by default.</p>
            </div>

            <button 
              type="submit" 
              disabled={isSaving}
              style={{ backgroundColor: '#2271b1', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '3px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
              {isSaving ? 'Adding...' : `Add New ${singular}`}
            </button>
          </form>
        </div>

        {/* Right Side: Table */}
        <div style={{ flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #c3c4c7', boxShadow: '0 1px 1px rgba(0,0,0,.04)' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #c3c4c7', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 400, color: '#2c3338' }}>Name</th>
                <th style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 400, color: '#2c3338' }}>Description</th>
                <th style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 400, color: '#2c3338' }}>Slug</th>
                <th style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 400, color: '#2c3338' }}>Count</th>
              </tr>
            </thead>
            <tbody>
              {terms.map(term => (
                <tr key={term.id} style={{ borderBottom: '1px solid #c3c4c7' }}>
                  <td style={{ padding: '10px', color: '#2271b1', fontWeight: 600, fontSize: '14px' }}>{term.name}</td>
                  <td style={{ padding: '10px', color: '#2c3338', fontSize: '13px' }}>{term.description || '—'}</td>
                  <td style={{ padding: '10px', color: '#2c3338', fontSize: '13px' }}>{term.slug}</td>
                  <td style={{ padding: '10px', color: '#2271b1', fontSize: '13px' }}>{term.count}</td>
                </tr>
              ))}
              {terms.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '10px', color: '#646970' }}>No {title.toLowerCase()} found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
