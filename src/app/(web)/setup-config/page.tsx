"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { translations, getTranslation, LanguageCode } from "@/lib/i18n"

function SetupConfigForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const step = searchParams.get("step") || "0"
  const lang = searchParams.get("lang") || "en"
  const t = getTranslation(lang)

  // Step 1 State
  const [dbName, setDbName] = useState("nodepress")
  const [username, setUsername] = useState("postgres")
  const [password, setPassword] = useState("")
  const [host, setHost] = useState("localhost")
  const [port, setPort] = useState("5432")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(() => {
    return searchParams.get("db_error") ? t.setupConfigDesc : ""
  })

  const handleLanguageSelect = (selectedLang: string) => {
    router.push(`/setup-config?step=1&lang=${selectedLang}`)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/setup-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbName, username, password, host, port }),
      })

      if (res.ok) {
        // Success! Redirect to install step passing the lang
        router.push(`/admin/install?lang=${lang}`)
      } else {
        const data = await res.json()
        setError(data.error + (data.details ? ` (${data.details})` : ""))
      }
    } catch (err: any) {
      setError("An unexpected error occurred: " + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === "0") {
    // Step 0: Language Selection
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f0f1', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '30px', border: '1px solid #c3c4c7', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1d2327', margin: 0 }}>NodePress</h1>
          </div>
          
          <div style={{ border: '1px solid #dcdcde', maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {Object.keys(translations).map((lCode) => (
                <li key={lCode} style={{ borderBottom: '1px solid #f0f0f1' }}>
                  <button 
                    onClick={() => handleLanguageSelect(lCode)}
                    style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '15px', color: '#2271b1' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f6f7f7'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {translations[lCode as LanguageCode].languageName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Step 1: Database Config
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f0f1', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '500px', backgroundColor: 'white', padding: '30px', border: '1px solid #c3c4c7', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1d2327', margin: 0 }}>NodePress</h1>
          <p style={{ color: '#646970', marginTop: '10px' }}>{t.setupConfigTitle}</p>
        </div>
        
        <p style={{ color: '#3c434a', marginBottom: '20px', lineHeight: '1.5' }}>
          {t.setupConfigDesc}
        </p>

        {error && (
          <div style={{ color: '#d63638', marginBottom: '20px', borderLeft: '4px solid #d63638', padding: '12px', backgroundColor: '#fff8f5', fontSize: '14px', overflowWrap: 'break-word' }}>
            <strong>{t.dbErrorPrefix}</strong><br />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <table style={{ width: '100%', borderSpacing: '0 15px' }}>
            <tbody>
              <tr>
                <td style={{ width: '30%', verticalAlign: 'top', paddingTop: '8px' }}>
                  <label style={{ fontWeight: 600, color: '#2c3338', fontSize: '14px' }}>{t.dbName}</label>
                </td>
                <td>
                  <input 
                    type="text" 
                    required
                    value={dbName} 
                    onChange={e => setDbName(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '15px', border: '1px solid #8c8f94', borderRadius: '3px' }} 
                  />
                  <div style={{ fontSize: '12px', color: '#646970', marginTop: '4px' }}>{t.dbNameDesc}</div>
                </td>
              </tr>

              <tr>
                <td style={{ verticalAlign: 'top', paddingTop: '8px' }}>
                  <label style={{ fontWeight: 600, color: '#2c3338', fontSize: '14px' }}>{t.username}</label>
                </td>
                <td>
                  <input 
                    type="text" 
                    required
                    value={username} 
                    onChange={e => setUsername(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '15px', border: '1px solid #8c8f94', borderRadius: '3px' }} 
                  />
                  <div style={{ fontSize: '12px', color: '#646970', marginTop: '4px' }}>{t.usernameDesc}</div>
                </td>
              </tr>

              <tr>
                <td style={{ verticalAlign: 'top', paddingTop: '8px' }}>
                  <label style={{ fontWeight: 600, color: '#2c3338', fontSize: '14px' }}>{t.password}</label>
                </td>
                <td>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '15px', border: '1px solid #8c8f94', borderRadius: '3px' }} 
                  />
                  <div style={{ fontSize: '12px', color: '#646970', marginTop: '4px' }}>{t.passwordDesc}</div>
                </td>
              </tr>

              <tr>
                <td style={{ verticalAlign: 'top', paddingTop: '8px' }}>
                  <label style={{ fontWeight: 600, color: '#2c3338', fontSize: '14px' }}>{t.dbHost}</label>
                </td>
                <td>
                  <input 
                    type="text" 
                    required
                    value={host} 
                    onChange={e => setHost(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '15px', border: '1px solid #8c8f94', borderRadius: '3px' }} 
                  />
                  <div style={{ fontSize: '12px', color: '#646970', marginTop: '4px' }}>{t.dbHostDesc}</div>
                </td>
              </tr>

              <tr>
                <td style={{ verticalAlign: 'top', paddingTop: '8px' }}>
                  <label style={{ fontWeight: 600, color: '#2c3338', fontSize: '14px' }}>{t.dbPort}</label>
                </td>
                <td>
                  <input 
                    type="text" 
                    required
                    value={port} 
                    onChange={e => setPort(e.target.value)}
                    style={{ width: '100%', padding: '8px', fontSize: '15px', border: '1px solid #8c8f94', borderRadius: '3px' }} 
                  />
                  <div style={{ fontSize: '12px', color: '#646970', marginTop: '4px' }}>{t.dbPortDesc}</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ marginTop: '30px', textAlign: 'right' }}>
            <button 
              type="submit" 
              disabled={isSubmitting}
              style={{ padding: '8px 16px', fontSize: '15px', backgroundColor: '#2271b1', color: 'white', border: 'none', borderRadius: '3px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? t.submittingDb : t.submitDb}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SetupConfigPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>}>
      <SetupConfigForm />
    </Suspense>
  )
}

