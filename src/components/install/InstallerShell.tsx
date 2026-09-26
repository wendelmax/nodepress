import type { ReactNode } from 'react'
import { Check, Globe2, LockKeyhole, Sparkles } from 'lucide-react'

import { INSTALL_LOCALES, InstallLocaleCode } from '@/lib/install-locales'
import { getTranslation } from '@/lib/i18n'

type InstallerStep = 'language' | 'database' | 'site'

type InstallerShellProps = {
  currentStep: InstallerStep
  locale: InstallLocaleCode
  onLanguageChange: (locale: InstallLocaleCode) => void
  children: ReactNode
}

const stepOrder: InstallerStep[] = ['language', 'database', 'site']

export function InstallerShell({ currentStep, locale, onLanguageChange, children }: InstallerShellProps) {
  const t = getTranslation(locale)
  const currentIndex = stepOrder.indexOf(currentStep)
  const stepLabels = [t.setupStep, t.databaseStep, t.siteStep]

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-4 text-text sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-accent-purple/15 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-border bg-surface shadow-soft backdrop-blur-xl lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="relative hidden overflow-hidden bg-sidebar-gradient p-8 lg:flex lg:flex-col">
            <div className="absolute -right-20 top-20 h-44 w-44 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-gradient text-sm font-black tracking-tight text-white shadow-neon">
                NP
              </div>
              <div>
                <p className="text-sm font-bold tracking-wide text-white">NodePress</p>
                <p className="text-xs text-text-muted">Setup wizard</p>
              </div>
            </div>

            <div className="relative mt-auto">
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary-light">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <h1 className="max-w-[12rem] text-2xl font-bold leading-tight text-white">
                A thoughtful way to get started.
              </h1>
              <p className="mt-4 text-sm leading-6 text-text-secondary">
                Create a solid foundation for your content, community, and next big idea.
              </p>

              <div className="mt-10 space-y-5">
                {stepLabels.map((label, index) => {
                  const step = stepOrder[index]
                  const isDone = index < currentIndex
                  const isCurrent = step === currentStep

                  return (
                    <div key={step} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                        isDone
                          ? 'border-success bg-success text-white'
                          : isCurrent
                            ? 'border-primary bg-primary/20 text-primary-light'
                            : 'border-border-strong bg-surface-glass text-text-muted'
                      }`}>
                        {isDone ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${isCurrent ? 'text-white' : 'text-text-muted'}`}>{label}</p>
                        <p className="text-xs text-text-muted">{isCurrent ? 'In progress' : isDone ? 'Complete' : 'Up next'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="relative mt-auto flex items-center gap-2 border-t border-border pt-6 text-xs text-text-muted">
              <LockKeyhole className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              Your setup stays private
            </div>
          </aside>

          <section className="min-w-0 bg-background/35 px-5 py-6 sm:px-10 sm:py-9 lg:px-14 lg:py-12">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-text-muted lg:hidden">
                <Globe2 className="h-4 w-4 text-primary-light" aria-hidden="true" />
                NodePress setup
              </div>
              <div className="ml-auto flex items-center gap-2">
                <label htmlFor="installer-language" className="sr-only">{t.selectedLanguage}</label>
                <Globe2 className="hidden h-4 w-4 text-text-muted sm:block" aria-hidden="true" />
                <select
                  id="installer-language"
                  value={locale}
                  onChange={(event) => onLanguageChange(event.target.value as InstallLocaleCode)}
                  className="rounded-lg border border-border bg-surface-glass px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  {INSTALL_LOCALES.map((option) => (
                    <option key={option.code} value={option.code} className="bg-background text-text">
                      {option.nativeName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {children}
          </section>
        </div>
      </div>
    </main>
  )
}
