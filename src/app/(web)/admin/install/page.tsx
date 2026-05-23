"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { getTranslation } from "@/lib/i18n"

function InstallForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const lang = searchParams.get("lang") || "en"
  const t = getTranslation(lang)

  const [siteTitle, setSiteTitle] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(() => {
    return searchParams.get("db_error")
      ? "Error connecting to the database. Make sure your .env file is configured correctly and you have run 'npx prisma db push'."
      : ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteTitle, username, password, email, lang }),
      })

      if (res.ok) {
        router.push("/login?installed=true")
      } else {
        const data = await res.json()
        setError(data.error || "Installation failed.")
      }
    } catch (err) {
      setError("An unexpected error occurred.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f0f0f1', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '30px', border: '1px solid #c3c4c7', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#1d2327', margin: 0 }}>NodePress</h1>
          <p style={{ color: '#646970', marginTop: '10px' }}>{t.installTitle}</p>
        </div>
        
        {error && <div style={{ color: '#d63638', marginBottom: '20px', borderLeft: '4px solid #d63638', padding: '12px', backgroundColor: '#fff8f5' }}>{error}</div>}

        <p style={{ color: '#3c434a', marginBottom: '20px', lineHeight: '1.5' }}>
          {t.installDesc}
        </p>

        <h2 style={{ fontSize: '18px', marginBottom: '10px', color: '#1d2327' }}>{t.infoNeeded}</h2>
        <p style={{ color: '#646970', marginBottom: '20px', fontSize: '14px' }}>
          {t.infoDesc}
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#2c3338' }}>{t.siteTitle}</label>
            <input 
              type="text" 
              required
              value={siteTitle} 
              onChange={e => setSiteTitle(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #8c8f94', borderRadius: '3px' }} 
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#2c3338' }}>{t.adminUsername}</label>
            <input 
              type="text" 
              required
              value={username} 
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #8c8f94', borderRadius: '3px' }} 
            />
            <p style={{ fontSize: '12px', color: '#646970', marginTop: '5px' }}>{t.adminUsernameDesc}</p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#2c3338' }}>{t.adminPassword}</label>
            <input 
              type="password" 
              required
              value={password} 
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #8c8f94', borderRadius: '3px' }} 
            />
            <p style={{ fontSize: '12px', color: '#646970', marginTop: '5px' }}>{t.adminPasswordDesc}</p>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#2c3338' }}>{t.adminEmail}</label>
            <input 
              type="email" 
              required
              value={email} 
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px', border: '1px solid #8c8f94', borderRadius: '3px' }} 
            />
            <p style={{ fontSize: '12px', color: '#646970', marginTop: '5px' }}>{t.adminEmailDesc}</p>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ width: '100%', padding: '12px', fontSize: '16px', backgroundColor: '#2271b1', color: 'white', border: 'none', borderRadius: '3px', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
            {isSubmitting ? t.installingBtn : t.installBtn}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function InstallPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>}>
      <InstallForm />
    </Suspense>
  )
}

