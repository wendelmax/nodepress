"use client"

import { useState, useEffect } from "react"
import { useSettings } from "@/hooks/useSettings"
import {
  PageHeader, SettingsSection, FieldRow, SaveButton, StatusMessage, LoadingSpinner, selectCls
} from "@/components/admin/SettingsUI"

export default function OptionsReadingPage() {
  const { settings, setSettings, isLoading, isSaving, message, saveSettings } = useSettings()
  const [pages, setPages] = useState<{ id: number; postTitle: string }[]>([])

  useEffect(() => {
    fetch('/api/posts?type=page&status=all')
      .then(res => res.json())
      .then(data => setPages(data.filter((p: any) => p.postStatus !== 'trash')))
      .catch(err => console.error("Failed to load pages", err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await saveSettings({
      ...settings,
      show_on_front: settings.show_on_front || 'posts',
      page_on_front: settings.page_on_front || '',
      page_for_posts: settings.page_for_posts || ''
    })
  }

  if (isLoading) return <LoadingSpinner />

  const showPosts = (settings.show_on_front || 'posts') === 'posts'

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <PageHeader
        title="Configurações de Leitura"
        subtitle="Defina o que é exibido na página inicial e como o conteúdo é apresentado."
      />

      {message && <StatusMessage type={message.type} text={message.text} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <SettingsSection title="Exibição da Página Inicial" icon="🏠">
          <FieldRow label="Página inicial exibe">
            <div className="flex flex-col gap-3">
              {/* Option: Latest posts */}
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                showPosts ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface/30 hover:border-border-strong'
              }`}>
                <input
                  type="radio"
                  name="show_on_front"
                  value="posts"
                  checked={showPosts}
                  onChange={() => setSettings({ ...settings, show_on_front: 'posts' })}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <div className="text-xs font-semibold text-text">Seus últimos posts</div>
                  <div className="text-[11px] text-text-muted mt-0.5">Exibe os posts mais recentes em ordem cronológica.</div>
                </div>
              </label>

              {/* Option: Static page */}
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                !showPosts ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface/30 hover:border-border-strong'
              }`}>
                <input
                  type="radio"
                  name="show_on_front"
                  value="page"
                  checked={!showPosts}
                  onChange={() => setSettings({ ...settings, show_on_front: 'page' })}
                  className="mt-0.5 accent-primary"
                />
                <div className="flex-1">
                  <div className="text-xs font-semibold text-text">Uma página estática</div>
                  <div className="text-[11px] text-text-muted mt-0.5">Escolha páginas específicas abaixo.</div>
                </div>
              </label>

              {/* Page selectors (visible only when static page is selected) */}
              {!showPosts && (
                <div className="flex flex-col gap-3 ml-6 pl-4 border-l border-border/40">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary w-28">Página inicial:</span>
                    <select
                      value={settings.page_on_front || ''}
                      onChange={e => setSettings({ ...settings, page_on_front: e.target.value })}
                      className={selectCls}
                    >
                      <option value="">— Selecionar —</option>
                      {pages.map(p => <option key={p.id} value={p.id}>{p.postTitle}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary w-28">Página de posts:</span>
                    <select
                      value={settings.page_for_posts || ''}
                      onChange={e => setSettings({ ...settings, page_for_posts: e.target.value })}
                      className={selectCls}
                    >
                      <option value="">— Selecionar —</option>
                      {pages.map(p => <option key={p.id} value={p.id}>{p.postTitle}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </FieldRow>
        </SettingsSection>

        <SaveButton isSaving={isSaving} />
      </form>
    </div>
  )
}
