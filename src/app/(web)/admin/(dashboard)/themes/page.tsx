"use client"

import { useState, useEffect } from "react"

export default function ThemesPage() {
  const [themes, setThemes] = useState<any[]>([])
  const [activeTheme, setActiveTheme] = useState<string>("default")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Fetch available themes and active theme
    Promise.all([
      fetch('/api/themes').then(res => res.json()),
      fetch('/api/options?keys=active_theme').then(res => res.json())
    ]).then(([themesData, optionsData]) => {
      setThemes(themesData)
      setActiveTheme(optionsData.active_theme || 'default')
      setIsLoading(false)
    }).catch(err => {
      console.error("Failed to fetch themes", err)
      setIsLoading(false)
    })
  }, [])

  const handleActivate = async (slug: string) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_theme: slug })
      })

      if (res.ok) {
        setActiveTheme(slug)
        alert(`Theme '${slug}' activated successfully!`)
      } else {
        alert('Failed to activate theme.')
      }
    } catch (err) {
      alert('Error activating theme.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div>Loading themes...</div>

  return (
    <div style={{ maxWidth: '1000px' }}>
      <h1 style={{ fontSize: '23px', fontWeight: 400, margin: '0 0 20px 0' }}>Themes</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {themes.map(theme => {
          const isActive = activeTheme === theme.slug

          return (
            <div key={theme.slug} style={{ 
              backgroundColor: 'white', 
              border: isActive ? '2px solid #2271b1' : '1px solid #c3c4c7', 
              borderRadius: '3px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: isActive ? '0 0 0 1px #2271b1' : '0 1px 1px rgba(0,0,0,.04)'
            }}>
              <div style={{ 
                height: '180px', 
                backgroundColor: '#f0f0f1', 
                borderBottom: '1px solid #e2e4e7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8c8f94',
                fontSize: '48px',
                fontWeight: 'bold',
                textTransform: 'uppercase'
              }}>
                {theme.slug.substring(0, 2)}
              </div>
              <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: '15px', margin: '0 0 5px 0', color: '#2c3338' }}>{theme.name}</h2>
                <div style={{ fontSize: '13px', color: '#646970', marginBottom: '10px' }}>
                  By {theme.author} | Version {theme.version}
                </div>
                <p style={{ fontSize: '13px', color: '#3c434a', margin: '0 0 15px 0', flex: 1 }}>
                  {theme.description}
                </p>
                <div style={{ marginTop: 'auto', borderTop: '1px solid #f0f0f1', paddingTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                  {isActive ? (
                    <button 
                      disabled 
                      style={{ backgroundColor: '#2c3338', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '3px', cursor: 'default', fontSize: '13px' }}>
                      Active
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleActivate(theme.slug)}
                      disabled={isSaving}
                      style={{ backgroundColor: '#f6f7f7', color: '#2271b1', border: '1px solid #2271b1', padding: '6px 12px', borderRadius: '3px', cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '13px', fontWeight: 600 }}>
                      Activate
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
