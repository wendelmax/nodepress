"use client"

import { useEffect, useRef } from "react"
import {
  DashboardSettings,
  StatCardId,
  WidgetId,
  STAT_CARD_META,
  WIDGET_META,
  DEFAULT_SETTINGS,
  saveSettings,
} from "./dashboard-settings"

interface Props {
  isOpen: boolean
  onClose: () => void
  settings: DashboardSettings
  onChange: (s: DashboardSettings) => void
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="focus:outline-none"
    >
      <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-white/10'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-5' : 'left-0.5'}`} />
      </div>
    </button>
  )
}

export default function DashboardCustomizer({ isOpen, onClose, settings, onChange }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, onClose])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const update = (patch: Partial<DashboardSettings>) => {
    const next = { ...settings, ...patch }
    onChange(next)
    saveSettings(next)
  }

  const toggleCard = (id: StatCardId) => {
    const has = settings.statCards.includes(id)
    if (has && settings.statCards.length <= 1) return // keep at least one
    const next = has
      ? settings.statCards.filter(c => c !== id)
      : [...settings.statCards, id]
    update({ statCards: next })
  }

  const toggleWidget = (id: WidgetId) => {
    const has = settings.widgets.includes(id)
    const next = has
      ? settings.widgets.filter(w => w !== id)
      : [...settings.widgets, id]
    update({ widgets: next })
  }

  const handleReset = () => {
    onChange(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)
  }

  const leftWidgets  = WIDGET_META.filter(w => w.col === 'left')
  const rightWidgets = WIDGET_META.filter(w => w.col === 'right')

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 bottom-0 z-[70] w-full max-w-[380px] flex flex-col bg-background-secondary border-l border-border shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-text">⚙️ Personalizar Dashboard</h2>
            <p className="text-[10px] text-text-muted mt-0.5">Ajuste cards, widgets e layout. Salvo automaticamente.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-text-muted hover:text-text transition-all duration-200 text-sm"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-6">

          {/* Layout */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">Layout</h3>
            <div className="flex flex-col gap-3">

              {/* Grid columns */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-text-secondary">Colunas do painel principal</span>
                <div className="grid grid-cols-2 gap-2">
                  {([2, 3] as const).map(cols => (
                    <button
                      key={cols}
                      onClick={() => update({ gridCols: cols })}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all duration-200 ${
                        settings.gridCols === cols
                          ? 'border-primary/40 bg-primary/5 text-primary-light'
                          : 'border-border bg-surface/30 text-text-secondary hover:border-border-strong'
                      }`}
                    >
                      {/* Mini grid preview */}
                      <div className="flex gap-1 w-full">
                        {cols === 2 ? (
                          <>
                            <div className="flex-[2] h-6 rounded bg-current opacity-20" />
                            <div className="flex-1 h-6 rounded bg-current opacity-20" />
                          </>
                        ) : (
                          <>
                            <div className="flex-[2] h-6 rounded bg-current opacity-20" />
                            <div className="flex-1 flex flex-col gap-1">
                              <div className="h-2.5 rounded bg-current opacity-20" />
                              <div className="h-2.5 rounded bg-current opacity-20" />
                            </div>
                          </>
                        )}
                      </div>
                      {cols === 2 ? '2/3 + 1/3' : '2/3 + Sidebar'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact mode */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/20">
                <div>
                  <div className="text-xs font-semibold text-text">Modo Compacto</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Menos espaçamento entre os elementos</div>
                </div>
                <Toggle checked={settings.compact} onChange={v => update({ compact: v })} />
              </div>
            </div>
          </section>

          {/* Stat Cards */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">Cards de Estatísticas</h3>
            <div className="flex flex-col gap-2">
              {STAT_CARD_META.map(card => {
                const active = settings.statCards.includes(card.id)
                return (
                  <div
                    key={card.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                      active ? 'border-primary/20 bg-primary/[0.03]' : 'border-border bg-surface/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{card.icon}</span>
                      <span className="text-xs font-semibold text-text">{card.label}</span>
                    </div>
                    <Toggle
                      checked={active}
                      onChange={() => toggleCard(card.id)}
                    />
                  </div>
                )
              })}
            </div>
          </section>

          {/* Widgets — Left column */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">Widgets — Coluna Principal</h3>
            <div className="flex flex-col gap-2">
              {leftWidgets.map(widget => {
                const active = settings.widgets.includes(widget.id)
                return (
                  <div
                    key={widget.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                      active ? 'border-primary/20 bg-primary/[0.03]' : 'border-border bg-surface/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{widget.icon}</span>
                      <span className="text-xs font-semibold text-text">{widget.label}</span>
                    </div>
                    <Toggle checked={active} onChange={() => toggleWidget(widget.id)} />
                  </div>
                )
              })}
            </div>
          </section>

          {/* Widgets — Right column */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-3">Widgets — Barra Lateral</h3>
            <div className="flex flex-col gap-2">
              {rightWidgets.map(widget => {
                const active = settings.widgets.includes(widget.id)
                return (
                  <div
                    key={widget.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 ${
                      active ? 'border-primary/20 bg-primary/[0.03]' : 'border-border bg-surface/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{widget.icon}</span>
                      <span className="text-xs font-semibold text-text">{widget.label}</span>
                    </div>
                    <Toggle checked={active} onChange={() => toggleWidget(widget.id)} />
                  </div>
                )
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 flex-shrink-0 flex items-center justify-between gap-3">
          <button
            onClick={handleReset}
            className="text-xs text-text-muted hover:text-danger transition-colors font-medium"
          >
            ↺ Restaurar padrão
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-primary-gradient text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:shadow-neon transition-all duration-200"
          >
            ✓ Aplicar
          </button>
        </div>
      </div>
    </>
  )
}
