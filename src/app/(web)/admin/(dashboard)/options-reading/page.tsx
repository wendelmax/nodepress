"use client"

import { useSettings } from "@/hooks/useSettings"
import { useState, useEffect } from "react"

export default function OptionsReadingPage() {
  const { settings, setSettings, isLoading, isSaving, message, saveSettings } = useSettings()
  const [pages, setPages] = useState<{ id: number, postTitle: string }[]>([])

  useEffect(() => {
    fetch('/api/posts?type=page&status=all')
      .then(res => res.json())
      .then(data => {
        // Filter out trashed pages if any were returned
        const activePages = data.filter((p: any) => p.postStatus !== 'trash')
        setPages(activePages)
      })
      .catch(err => console.error("Failed to load pages", err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Default values if empty
    const toSave = {
      ...settings,
      show_on_front: settings.show_on_front || 'posts',
      page_on_front: settings.page_on_front || '',
      page_for_posts: settings.page_for_posts || ''
    }
    await saveSettings(toSave)
  }

  if (isLoading) {
    return <div style={{ padding: '20px' }}>Loading settings...</div>
  }

  const showOnFront = settings.show_on_front || 'posts'

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0', marginBottom: '20px' }}>
        Reading Settings
      </h1>

      {message && (
        <div style={{ 
          borderLeft: `4px solid ${message.type === 'success' ? '#00a32a' : '#d63638'}`, 
          backgroundColor: '#fff', 
          padding: '12px', 
          marginBottom: '20px', 
          boxShadow: '0 1px 1px rgba(0,0,0,.04)' 
        }}>
          <p style={{ margin: 0 }}>{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', width: '200px', fontWeight: 600, color: '#2c3338', verticalAlign: 'top' }}>
                <label>Your homepage displays</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="radio" 
                      name="show_on_front" 
                      value="posts"
                      checked={showOnFront === 'posts'}
                      onChange={(e) => setSettings({ ...settings, show_on_front: e.target.value })}
                    />
                    Your latest posts
                  </label>
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <input 
                      type="radio" 
                      name="show_on_front" 
                      value="page"
                      checked={showOnFront === 'page'}
                      onChange={(e) => setSettings({ ...settings, show_on_front: e.target.value })}
                    />
                    A static page (select below)
                  </label>
                  
                  <div style={{ marginLeft: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ width: '100px', color: showOnFront === 'posts' ? '#a7aaad' : 'inherit' }}>Homepage:</label>
                      <select 
                        value={settings.page_on_front || ''}
                        onChange={(e) => setSettings({ ...settings, page_on_front: e.target.value })}
                        disabled={showOnFront === 'posts'}
                        style={{ padding: '4px', border: '1px solid #8c8f94', borderRadius: '3px', width: '250px' }}
                      >
                        <option value="">&mdash; Select &mdash;</option>
                        {pages.map(p => <option key={p.id} value={p.id}>{p.postTitle}</option>)}
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ width: '100px', color: showOnFront === 'posts' ? '#a7aaad' : 'inherit' }}>Posts page:</label>
                      <select 
                        value={settings.page_for_posts || ''}
                        onChange={(e) => setSettings({ ...settings, page_for_posts: e.target.value })}
                        disabled={showOnFront === 'posts'}
                        style={{ padding: '4px', border: '1px solid #8c8f94', borderRadius: '3px', width: '250px' }}
                      >
                        <option value="">&mdash; Select &mdash;</option>
                        {pages.map(p => <option key={p.id} value={p.id}>{p.postTitle}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '20px' }}>
          <button 
            type="submit" 
            disabled={isSaving}
            style={{ 
              backgroundColor: '#2271b1', 
              color: 'white', 
              border: 'none', 
              padding: '6px 12px', 
              borderRadius: '3px', 
              cursor: isSaving ? 'not-allowed' : 'pointer', 
              fontSize: '13px' 
            }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
