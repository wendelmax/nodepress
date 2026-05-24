/**
 * Shared UI primitives for Admin Settings pages.
 * All components follow the dark SaaS Tailwind v3 theme.
 */
import { ReactNode } from 'react'
import { Save } from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// StatusMessage — success / error alert banner
// ──────────────────────────────────────────────────────────────
export function StatusMessage({ type, text }: { type: 'success' | 'error'; text: string }) {
  return (
    <div className={`flex items-start gap-2.5 text-xs p-3.5 rounded-xl border ${
      type === 'success'
        ? 'bg-success/10 border-success/20 text-success'
        : 'bg-danger/10 border-danger/20 text-danger'
    }`}>
      <span className="flex-shrink-0 font-bold">{type === 'success' ? '✓' : '✕'}</span>
      <span>{text}</span>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// PageHeader — page title + optional subtitle
// ──────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border/40 pb-4 mb-6">
      <h1 className="text-2xl font-bold text-text leading-none">{title}</h1>
      {subtitle && <p className="text-xs text-text-secondary mt-1.5">{subtitle}</p>}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// SettingsSection — labeled group of fields inside a Card
// ──────────────────────────────────────────────────────────────
export function SettingsSection({ title, icon, children }: { title: string; icon?: string | ReactNode; children: ReactNode }) {
  return (
    <div className="bg-surface/40 border border-border rounded-2xl p-6 flex flex-col gap-5">
      <h2 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border/40 pb-3">
        {icon && <span>{icon}</span>}
        {title}
      </h2>
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// FieldRow — label + input side-by-side layout
// ──────────────────────────────────────────────────────────────
export function FieldRow({ label, hint, children, required }: {
  label: string
  hint?: string
  children: ReactNode
  required?: boolean
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-6">
      <div className="md:w-44 flex-shrink-0 pt-2.5">
        <span className="text-xs font-semibold text-text-secondary">
          {label} {required && <span className="text-danger">*</span>}
        </span>
      </div>
      <div className="flex-1 flex flex-col gap-1.5">
        {children}
        {hint && <p className="text-[11px] text-text-muted leading-relaxed">{hint}</p>}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Shared input / select / textarea className
// ──────────────────────────────────────────────────────────────
export const inputCls = 'w-full max-w-md bg-background border border-border text-text text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary/50 focus:shadow-glow transition-all placeholder:text-text-muted'
export const selectCls = 'w-full max-w-xs bg-background border border-border text-text text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary/50 transition-all'
export const textareaCls = 'w-full max-w-md bg-background border border-border text-text text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary/50 transition-all placeholder:text-text-muted resize-y min-h-[80px]'

// ──────────────────────────────────────────────────────────────
// SaveButton
// ──────────────────────────────────────────────────────────────
export function SaveButton({ isSaving, label = 'Salvar Alterações' }: { isSaving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={isSaving}
      className="flex items-center gap-2 bg-primary-gradient text-white font-semibold text-xs px-6 py-3 rounded-xl hover:shadow-neon transition-all duration-200 disabled:opacity-60"
    >
      {isSaving ? (
        <>
          <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
          Salvando...
        </>
      ) : (
        <>
          <Save size={16} /> {label}
        </>
      )}
    </button>
  )
}

// ──────────────────────────────────────────────────────────────
// LoadingSpinner
// ──────────────────────────────────────────────────────────────
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
