"use client"

import { useState, useEffect } from "react"

export default function OptionsSeoPage() {
  const [options, setOptions] = useState({
    seo_site_title: "",
    seo_meta_description: "",
    seo_og_image: "",
    seo_twitter_handle: "",
    analytics_ga4_id: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/options?keys=seo_site_title,seo_meta_description,seo_og_image,seo_twitter_handle,analytics_ga4_id')
      .then(res => res.json())
      .then(data => {
        setOptions({
          seo_site_title: data.seo_site_title || "",
          seo_meta_description: data.seo_meta_description || "",
          seo_og_image: data.seo_og_image || "",
          seo_twitter_handle: data.seo_twitter_handle || "",
          analytics_ga4_id: data.analytics_ga4_id || ""
        })
        setIsLoading(false)
      })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })

      if (res.ok) {
        alert('Settings saved successfully!')
      } else {
        alert('Failed to save settings.')
      }
    } catch (err) {
      alert('Error saving settings.')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePurgeCache = async () => {
    try {
      const res = await fetch('/api/revalidate?path=/', { method: 'POST' })
      if (res.ok) {
        alert('Site cache purged successfully!')
      } else {
        alert('Failed to purge cache.')
      }
    } catch (err) {
      alert('Error purging cache.')
    }
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '23px', fontWeight: 400, margin: '0 0 20px 0' }}>SEO & Performance</h1>

      <form onSubmit={handleSave} style={{ backgroundColor: 'white', padding: '20px', border: '1px solid #c3c4c7', boxShadow: '0 1px 1px rgba(0,0,0,.04)' }}>
        
        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: 0 }}>Global SEO Settings</h2>
        
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <th style={{ width: '200px', padding: '15px 10px 15px 0', verticalAlign: 'top', fontWeight: 600, color: '#2c3338' }}>Site SEO Title</th>
              <td style={{ padding: '15px 0' }}>
                <input 
                  type="text" 
                  value={options.seo_site_title}
                  onChange={(e) => setOptions({ ...options, seo_site_title: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                  placeholder="My Awesome Blog - Technology and News"
                />
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#646970' }}>If left blank, the standard Site Title will be used.</p>
              </td>
            </tr>
            <tr>
              <th style={{ padding: '15px 10px 15px 0', verticalAlign: 'top', fontWeight: 600, color: '#2c3338' }}>Meta Description</th>
              <td style={{ padding: '15px 0' }}>
                <textarea 
                  value={options.seo_meta_description}
                  onChange={(e) => setOptions({ ...options, seo_meta_description: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px', minHeight: '80px' }}
                />
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#646970' }}>Keep it between 120-156 characters for optimal display in search engines.</p>
              </td>
            </tr>
            <tr>
              <th style={{ padding: '15px 10px 15px 0', verticalAlign: 'top', fontWeight: 600, color: '#2c3338' }}>Default OpenGraph Image URL</th>
              <td style={{ padding: '15px 0' }}>
                <input 
                  type="url" 
                  value={options.seo_og_image}
                  onChange={(e) => setOptions({ ...options, seo_og_image: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                  placeholder="https://example.com/default-og.jpg"
                />
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#646970' }}>Used when a post/page doesn&apos;t have a featured image.</p>
              </td>
            </tr>
            <tr>
              <th style={{ padding: '15px 10px 15px 0', verticalAlign: 'top', fontWeight: 600, color: '#2c3338' }}>Twitter Handle</th>
              <td style={{ padding: '15px 0' }}>
                <input 
                  type="text" 
                  value={options.seo_twitter_handle}
                  onChange={(e) => setOptions({ ...options, seo_twitter_handle: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                  placeholder="@nodepress"
                />
              </td>
            </tr>
          </tbody>
        </table>

        <h2 style={{ fontSize: '18px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginTop: '30px' }}>Analytics & Performance</h2>

        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <th style={{ width: '200px', padding: '15px 10px 15px 0', verticalAlign: 'top', fontWeight: 600, color: '#2c3338' }}>Google Analytics 4 ID</th>
              <td style={{ padding: '15px 0' }}>
                <input 
                  type="text" 
                  value={options.analytics_ga4_id}
                  onChange={(e) => setOptions({ ...options, analytics_ga4_id: e.target.value })}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                  placeholder="G-XXXXXXXXXX"
                />
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#646970' }}>This will be injected optimally using @next/third-parties to ensure 100/100 Core Web Vitals.</p>
              </td>
            </tr>
            <tr>
              <th style={{ padding: '15px 10px 15px 0', verticalAlign: 'top', fontWeight: 600, color: '#2c3338' }}>Cache Management</th>
              <td style={{ padding: '15px 0' }}>
                <button 
                  type="button"
                  onClick={handlePurgeCache}
                  style={{ backgroundColor: '#fff', border: '1px solid #d63638', color: '#d63638', padding: '6px 12px', borderRadius: '3px', cursor: 'pointer' }}
                >
                  Purge Entire Site Cache
                </button>
                <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#646970' }}>Forces Next.js to revalidate the frontend pages. Use this if your recent updates aren&apos;t appearing on the public site.</p>
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '30px' }}>
          <button 
            type="submit" 
            disabled={isSaving}
            style={{ backgroundColor: '#2271b1', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '3px', cursor: isSaving ? 'not-allowed' : 'pointer' }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </form>
    </div>
  )
}
