'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, ArrowRight, Database, Loader2, Search, ServerCog, ShieldCheck } from 'lucide-react'

import { InstallerShell } from '@/components/install/InstallerShell'
import { INSTALL_LOCALES, InstallLocaleCode, normalizeInstallLocale } from '@/lib/install-locales'
import { getTranslation } from '@/lib/i18n'

function SetupConfigForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const step = searchParams.get('step') === '1' ? 1 : 0
  const locale = normalizeInstallLocale(searchParams.get('lang'))
  const t = getTranslation(locale)

  const [selectedLocale, setSelectedLocale] = useState<InstallLocaleCode>(locale)
  const [languageQuery, setLanguageQuery] = useState('')
  const [dbName, setDbName] = useState('nodepress')
  const [username, setUsername] = useState('postgres')
  const [password, setPassword] = useState('')
  const [host, setHost] = useState('localhost')
  const [port, setPort] = useState('5432')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(searchParams.get('db_error') ? t.setupConfigDesc : '')

  const filteredLocales = INSTALL_LOCALES.filter((option) => {
    const query = languageQuery.trim().toLowerCase()
    return !query || `${option.nativeName} ${option.englishName} ${option.code}`.toLowerCase().includes(query)
  })

  const updateLocale = (nextLocale: InstallLocaleCode) => {
    setSelectedLocale(nextLocale)
    router.push(`/setup-config?step=${step}&lang=${encodeURIComponent(nextLocale)}`)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/setup-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbName, username, password, host, port }),
      })

      if (response.ok) {
        router.push(`/admin/install?lang=${encodeURIComponent(locale)}`)
      } else {
        const data = await response.json()
        setError(`${data.error || t.dbErrorPrefix}${data.details ? ` (${data.details})` : ''}`)
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : t.dbErrorPrefix)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <InstallerShell currentStep={step === 0 ? 'language' : 'database'} locale={locale} onLanguageChange={updateLocale}>
      {step === 0 ? (
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 max-w-2xl">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-light">Step 01 / 03</p>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t.languageTitle}</h2>
            <p className="mt-3 text-base leading-7 text-text-secondary">{t.languageDesc}</p>
          </div>

          <div className="rounded-2xl border border-border bg-surface-glass p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="relative flex min-w-0 flex-1 items-center">
                <Search className="pointer-events-none absolute left-4 h-4 w-4 text-text-muted" aria-hidden="true" />
                <span className="sr-only">{t.searchLanguages}</span>
                <input
                  type="search"
                  value={languageQuery}
                  onChange={(event) => setLanguageQuery(event.target.value)}
                  placeholder={t.searchLanguages}
                  className="w-full rounded-xl border border-border bg-background/70 py-3 pl-11 pr-4 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <span className="text-xs font-medium text-text-muted">{filteredLocales.length} {t.languageCount}</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t.languageTitle}>
              {filteredLocales.map((option) => {
                const isSelected = selectedLocale === option.code
                return (
                  <button
                    key={option.code}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedLocale(option.code)}
                    className={`group flex items-center gap-3 rounded-xl border p-4 text-left transition ${isSelected
                      ? 'border-primary bg-primary/10 shadow-glow'
                      : 'border-border bg-background/30 hover:border-border-strong hover:bg-surface-glass'
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ${isSelected ? 'bg-primary-gradient text-white' : 'bg-surface-elevated text-text-secondary group-hover:text-white'}`}>
                      {option.shortCode}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{option.nativeName}</span>
                      <span className="mt-0.5 block truncate text-xs text-text-muted">{option.englishName}</span>
                    </span>
                    <span className={`h-4 w-4 rounded-full border-2 ${isSelected ? 'border-primary bg-primary ring-4 ring-primary/20' : 'border-border-strong'}`} aria-hidden="true" />
                  </button>
                )
              })}
            </div>

            <div className="mt-6 flex flex-col gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-text-muted">{t.selectedLanguage}: <span className="font-semibold text-text-secondary">{INSTALL_LOCALES.find((option) => option.code === selectedLocale)?.nativeName}</span></p>
              <button
                type="button"
                onClick={() => router.push(`/setup-config?step=1&lang=${encodeURIComponent(selectedLocale)}`)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-gradient px-5 py-3 text-sm font-bold text-white shadow-neon transition hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(79,124,255,0.45)]"
              >
                {t.continue}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-light">Step 02 / 03</p>
              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{t.setupConfigTitle}</h2>
              <p className="mt-3 text-base leading-7 text-text-secondary">{t.setupConfigDesc}</p>
            </div>
            <div className="hidden rounded-2xl border border-success/20 bg-success/10 p-3 text-success sm:block">
              <Database className="h-5 w-5" aria-hidden="true" />
            </div>
          </div>

          {error && (
            <div role="alert" className="mb-6 flex gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4 text-sm text-red-100">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
              <div><p className="font-semibold">{t.dbErrorPrefix}</p><p className="mt-1 break-words text-red-100/80">{error}</p></div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface-glass p-5 sm:p-7">
            <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary-light"><ServerCog className="h-5 w-5" aria-hidden="true" /></div>
              <div><h3 className="font-semibold text-white">PostgreSQL connection</h3><p className="text-xs text-text-muted">Your credentials are only used to configure this site.</p></div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="database-name" label={t.dbName} hint={t.dbNameDesc} value={dbName} onChange={setDbName} />
              <Field id="database-host" label={t.dbHost} hint={t.dbHostDesc} value={host} onChange={setHost} />
              <Field id="database-user" label={t.username} hint={t.usernameDesc} value={username} onChange={setUsername} />
              <Field id="database-port" label={t.dbPort} hint={t.dbPortDesc} value={port} onChange={setPort} inputMode="numeric" />
              <div className="sm:col-span-2"><Field id="database-password" label={t.password} hint={t.passwordDesc} value={password} onChange={setPassword} type="password" autoComplete="new-password" /></div>
            </div>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => router.push(`/setup-config?step=0&lang=${encodeURIComponent(locale)}`)} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-text-secondary transition hover:bg-surface-glass hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />{t.back}
              </button>
              <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-gradient px-5 py-3 text-sm font-bold text-white shadow-neon transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                {isSubmitting ? t.submittingDb : t.submitDb}
                {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </form>
        </div>
      )}
    </InstallerShell>
  )
}

type FieldProps = {
  id: string
  label: string
  hint: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  inputMode?: 'numeric' | 'text'
}

function Field({ id, label, hint, value, onChange, type = 'text', autoComplete, inputMode }: FieldProps) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-semibold text-text-secondary">{label}</span>
      <input id={id} type={type} required value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} inputMode={inputMode} className="w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-text outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20" />
      <span className="mt-2 block text-xs leading-5 text-text-muted">{hint}</span>
    </label>
  )
}

export default function SetupConfigPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-text-muted">Loading NodePress setup...</div>}>
      <SetupConfigForm />
    </Suspense>
  )
}
