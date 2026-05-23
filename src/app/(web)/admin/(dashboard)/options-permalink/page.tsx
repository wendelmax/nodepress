"use client"

import { useState, useEffect } from "react"

export default function OptionsPermalinkPage() {
  const [structure, setStructure] = useState("/%postname%/")
  const [customStructure, setCustomStructure] = useState("")
  const [siteUrl, setSiteUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (!data.error && data.permalink_structure) {
          const val = data.permalink_structure
          
          if (["/%postname%/", "/%year%/%monthnum%/%postname%/"].includes(val)) {
            setStructure(val)
          } else {
            setStructure("custom")
            setCustomStructure(val)
          }
        }
        if (data.siteurl) {
          setSiteUrl(data.siteurl.replace(/\/$/, ''))
        } else {
          setSiteUrl(window.location.origin)
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)

    const finalStructure = structure === "custom" ? customStructure : structure

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permalink_structure: finalStructure })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Permalink structure updated.' })
      } else {
        setMessage({ type: 'error', text: 'Failed to update.' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred.' })
    } finally {
      setIsSaving(false)
      setTimeout(() => setMessage(null), 3000)
    }
  }

  if (isLoading) return <div style={{ padding: '20px' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0', marginBottom: '20px' }}>
        Permalink Settings
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

      <p style={{ color: '#646970', marginBottom: '20px' }}>
        NodePress offers you the ability to create a custom URL structure for your permalinks and archives. Custom URL structures can improve the aesthetics, usability, and forward-compatibility of your links.
      </p>

      <form onSubmit={handleSubmit}>
        <h2 style={{ fontSize: '14px', marginBottom: '10px' }}>Common Settings</h2>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <tbody>
            <tr>
              <td style={{ padding: '10px 0', width: '30px' }}>
                <input 
                  type="radio" 
                  name="permalink_structure" 
                  value="/%postname%/"
                  checked={structure === "/%postname%/"}
                  onChange={(e) => setStructure(e.target.value)}
                  id="permalink-postname"
                />
              </td>
              <th style={{ fontWeight: 'normal', color: '#2c3338' }}>
                <label htmlFor="permalink-postname"><strong>Post name</strong></label>
              </th>
              <td style={{ color: '#646970' }}>
                <code>{siteUrl || window.location.origin}/sample-post</code>
              </td>
            </tr>

            <tr>
              <td style={{ padding: '10px 0' }}>
                <input 
                  type="radio" 
                  name="permalink_structure" 
                  value="/%year%/%monthnum%/%postname%/"
                  checked={structure === "/%year%/%monthnum%/%postname%/"}
                  onChange={(e) => setStructure(e.target.value)}
                  id="permalink-month"
                />
              </td>
              <th style={{ fontWeight: 'normal', color: '#2c3338' }}>
                <label htmlFor="permalink-month"><strong>Month and name</strong></label>
              </th>
              <td style={{ color: '#646970' }}>
                <code>{siteUrl || window.location.origin}/2026/05/sample-post</code>
              </td>
            </tr>

            <tr>
              <td style={{ padding: '10px 0' }}>
                <input 
                  type="radio" 
                  name="permalink_structure" 
                  value="custom"
                  checked={structure === "custom"}
                  onChange={(e) => setStructure(e.target.value)}
                  id="permalink-custom"
                />
              </td>
              <th style={{ fontWeight: 'normal', color: '#2c3338' }}>
                <label htmlFor="permalink-custom"><strong>Custom Structure</strong></label>
              </th>
              <td>
                <input 
                  type="text" 
                  value={structure === "custom" ? customStructure : (["/%postname%/", "/%year%/%monthnum%/%postname%/"].includes(structure) ? structure : '')}
                  onChange={(e) => {
                    setStructure("custom")
                    setCustomStructure(e.target.value)
                  }}
                  onFocus={() => setStructure("custom")}
                  style={{ width: '100%', maxWidth: '300px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                />
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ marginTop: '30px' }}>
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
