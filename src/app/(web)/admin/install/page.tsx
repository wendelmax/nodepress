'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle2, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'

import { InstallerShell } from '@/components/install/InstallerShell'
import { InstallLocaleCode, normalizeInstallLocale } from '@/lib/install-locales'
import { getTranslation } from '@/lib/i18n'

type AuthConfig = { local: boolean; keycloak: boolean }

function InstallForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = normalizeInstallLocale(searchParams.get('lang'))
  const t = getTranslation(locale)

  const [siteTitle, setSiteTitle] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authConfig, setAuthConfig] = useState<AuthConfig>({ local: true, keycloak: false })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(searchParams.get('db_error') ? t.dbErrorPrefix : '')

  useEffect(() => {
    fetch('/api/auth/config')
      .then((response) => response.json())
      .then(setAuthConfig)
      .catch(() => undefined)
  }, [])

  const updateLocale = (nextLocale: InstallLocaleCode) => {
    router.push(`/admin/install?lang=${encodeURIComponent(nextLocale)}`)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteTitle, username, email, password, lang: locale }),
      })

      if (response.ok) {
        router.push('/login?installed=true')
      } else {
        const data = await response.json()
        setError(data.error || t.installDesc)
      }
    } catch {
      setError(t.installDesc)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <InstallerShell currentStep="site" locale={locale} onLanguageChange={updateLocale}>
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-light">Step 03 / 03</p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t.installTitle}</h2>
          <p className="mt-3 text-base leading-7 text-text-secondary">{t.installDesc}</p>
        </div>

        {error && <div role="alert" className="mb-6 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-100">{error}</div>}

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <AuthStatus icon={<UserRound className="h-4 w-4" aria-hidden="true" />} label={t.localAuth} enabled={authConfig.local} enabledText={t.enabled} disabledText={t.configuredLater} />
          <AuthStatus icon={<KeyRound className="h-4 w-4" aria-hidden="true" />} label={t.keycloakAuth} enabled={authConfig.keycloak} enabledText={t.enabled} disabledText={t.configuredLater} />
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface-glass p-5 sm:p-7">
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary-light"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div>
            <div><h3 className="font-semibold text-white">{t.infoNeeded}</h3><p className="text-xs text-text-muted">{t.infoDesc}</p></div>
          </div>

          <div className="space-y-5">
            <Field id="site-title" label={t.siteTitle} value={siteTitle} onChange={setSiteTitle} />
            <Field id="admin-username" label={t.adminUsername} hint={t.adminUsernameDesc} value={username} onChange={setUsername} autoComplete="username" />
            {authConfig.local && <Field id="admin-password" label={t.adminPassword} hint={t.adminPasswordDesc} value={password} onChange={setPassword} type="password" autoComplete="new-password" minLength={8} />}
            <Field id="admin-email" label={t.adminEmail} hint={t.adminEmailDesc} value={email} onChange={setEmail} type="email" autoComplete="email" />
          </div>

          <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs leading-5 text-text-muted"><LockKeyhole className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />{t.secureInstall}</div>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-gradient px-5 py-3 text-sm font-bold text-white shadow-neon transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              {isSubmitting ? t.installingBtn : t.installBtn}
              {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </form>
      </div>
    </InstallerShell>
  )
}

function AuthStatus({ icon, label, enabled, enabledText, disabledText }: { icon: React.ReactNode; label: string; enabled: boolean; enabledText: string; disabledText: string }) {
  return (
    <div className={`flex items-center justify-between rounded-xl border p-4 ${enabled ? 'border-success/20 bg-success/5' : 'border-border bg-surface-glass'}`}>
      <div className="flex items-center gap-3"><span className={enabled ? 'text-success' : 'text-text-muted'}>{icon}</span><span className="text-sm font-medium text-text-secondary">{label}</span></div>
      <span className={`text-xs font-semibold ${enabled ? 'text-success' : 'text-text-muted'}`}>{enabled ? enabledText : disabledText}</span>
    </div>
  )
}

function Field({ id, label, hint, value, onChange, type = 'text', autoComplete, minLength }: { id: string; label: string; hint?: string; value: string; onChange: (value: string) => void; type?: string; autoComplete?: string; minLength?: number }) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-semibold text-text-secondary">{label}</span>
      <div className="relative"><input id={id} type={type} required value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} minLength={minLength} className="w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20" />{type === 'email' && <Mail className="pointer-events-none absolute right-4 top-3.5 h-4 w-4 text-text-muted" aria-hidden="true" />}</div>
      {hint && <span className="mt-2 block text-xs leading-5 text-text-muted">{hint}</span>}
    </label>
  )
}

export default function InstallPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-text-muted">Loading NodePress setup...</div>}>
      <InstallForm />
    </Suspense>
  )
}
