"use client"

import { useSettings } from "@/hooks/useSettings"
import { translations, LanguageCode } from "@/lib/i18n"

export default function OptionsGeneralPage() {
  const { settings, setSettings, isLoading, isSaving, message, saveSettings } = useSettings()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveSettings(settings)
  }

  if (isLoading) {
    return <div style={{ padding: '20px' }}>Loading settings...</div>
  }

  return (
    <div style={{ maxWidth: '800px' }}>
      <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0', marginBottom: '20px' }}>
        General Settings
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
                <label>Site Title</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <input 
                  type="text" 
                  value={settings.blogname}
                  onChange={(e) => setSettings({ ...settings, blogname: e.target.value })}
                  style={{ width: '100%', maxWidth: '400px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                />
              </td>
            </tr>

            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', fontWeight: 600, color: '#2c3338', verticalAlign: 'top' }}>
                <label>Tagline</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <input 
                  type="text" 
                  value={settings.blogdescription}
                  onChange={(e) => setSettings({ ...settings, blogdescription: e.target.value })}
                  style={{ width: '100%', maxWidth: '400px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                />
                <p style={{ fontSize: '13px', color: '#646970', margin: '4px 0 0 0' }}>In a few words, explain what this site is about.</p>
              </td>
            </tr>

            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', fontWeight: 600, color: '#2c3338', verticalAlign: 'top' }}>
                <label>Site Address (URL)</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <input 
                  type="text" 
                  value={settings.siteurl}
                  onChange={(e) => setSettings({ ...settings, siteurl: e.target.value })}
                  style={{ width: '100%', maxWidth: '400px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                />
              </td>
            </tr>

            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', fontWeight: 600, color: '#2c3338', verticalAlign: 'top' }}>
                <label>Administration Email Address</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <input 
                  type="email" 
                  value={settings.admin_email}
                  onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
                  style={{ width: '100%', maxWidth: '400px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                />
                <p style={{ fontSize: '13px', color: '#646970', margin: '4px 0 0 0' }}>This address is used for admin purposes.</p>
              </td>
            </tr>

            <tr style={{ borderBottom: '1px solid #f0f0f1' }}>
              <th style={{ padding: '20px 10px 20px 0', fontWeight: 600, color: '#2c3338', verticalAlign: 'top' }}>
                <label>Site Language</label>
              </th>
              <td style={{ padding: '20px 10px' }}>
                <select 
                  value={settings.site_language} 
                  onChange={(e) => setSettings({ ...settings, site_language: e.target.value })}
                  style={{ width: '100%', maxWidth: '200px', padding: '6px 8px', border: '1px solid #8c8f94', borderRadius: '3px' }}
                >
                  {Object.keys(translations).map((langCode) => (
                    <option key={langCode} value={langCode}>
                      {translations[langCode as LanguageCode].languageName}
                    </option>
                  ))}
                </select>
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
