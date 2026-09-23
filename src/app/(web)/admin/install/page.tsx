"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { getTranslation } from "@/lib/i18n"

type AuthConfig = {
  local: boolean
  keycloak: boolean
}

function InstallForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const lang = searchParams.get("lang") || "en"
  const t = getTranslation(lang)

  const [siteTitle, setSiteTitle] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authConfig, setAuthConfig] = useState<AuthConfig>({ local: true, keycloak: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(() => {
    return searchParams.get("db_error")
      ? "Error connecting to the database. Make sure your .env file is configured correctly and you have run 'npx prisma db push'."
      : ""
  })

  useEffect(() => {
    fetch("/api/auth/config")
      .then((response) => response.json())
      .then(setAuthConfig)
      .catch(() => undefined)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteTitle, username, email, password, lang }),
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
    <div className="flex justify-center items-center min-h-screen bg-background p-5 font-sans">
      <div className="w-full max-w-md bg-surface-elevated p-8 sm:p-10 border border-border rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md">
        
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/logo.png" alt="NodePress Logo" className="h-20 w-auto mb-4" />
          <p className="text-text-muted text-sm">{t.installTitle}</p>
        </div>
        
        {error && (
          <div className="text-danger mb-6 border-l-4 border-danger p-3 bg-danger/10 rounded-r-lg text-sm font-medium">
            {error}
          </div>
        )}

        <p className="text-text-secondary mb-6 leading-relaxed text-sm">
          {t.installDesc}
        </p>

        <h2 className="text-lg font-semibold text-white mb-2">{t.infoNeeded}</h2>
        <p className="text-text-muted mb-6 text-xs">
          {t.infoDesc}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="site-title" className="block font-semibold text-text-secondary text-sm">{t.siteTitle}</label>
            <input 
              id="site-title"
              type="text" 
              required
              value={siteTitle} 
              onChange={e => setSiteTitle(e.target.value)}
              className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-xl text-base text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder-text-muted" 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="admin-username" className="block font-semibold text-text-secondary text-sm">{t.adminUsername}</label>
            <input 
              id="admin-username"
              type="text" 
              required
              value={username} 
              onChange={e => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-xl text-base text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder-text-muted" 
            />
            <p className="text-[11px] text-text-muted mt-0.5">{t.adminUsernameDesc}</p>
          </div>

          {authConfig.local && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-password" className="block font-semibold text-text-secondary text-sm">{t.adminPassword}</label>
              <input
                id="admin-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-xl text-base text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder-text-muted"
              />
              <p className="text-[11px] text-text-muted mt-0.5">{t.adminPasswordDesc}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5 mb-2">
            <label htmlFor="admin-email" className="block font-semibold text-text-secondary text-sm">{t.adminEmail}</label>
            <input 
              id="admin-email"
              type="email" 
              required
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-background-tertiary border border-border rounded-xl text-base text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder-text-muted" 
            />
            <p className="text-[11px] text-text-muted mt-0.5">{t.adminEmailDesc}</p>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full py-3.5 bg-primary-gradient text-white text-base font-bold rounded-xl shadow-neon hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? t.installingBtn : t.installBtn}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function InstallPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text-muted font-medium">Loading installer...</p>
        </div>
      </div>
    }>
      <InstallForm />
    </Suspense>
  )
}
