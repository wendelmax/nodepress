"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useTaxonomies } from "@/hooks/useTaxonomies"
import { LoadingSpinner, PageHeader, inputCls, textareaCls } from "@/components/admin/SettingsUI"

function EditTagsContent() {
  const searchParams = useSearchParams()
  const taxonomy = (searchParams.get('taxonomy') as 'category' | 'post_tag') || 'category'
  const { terms, isLoading, isSaving, createTerm } = useTaxonomies(taxonomy)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const isCategory = taxonomy === 'category'
  const title = isCategory ? "Categorias" : "Tags"
  const singular = isCategory ? "Categoria" : "Tag"
  const icon = isCategory ? "🗂️" : "🏷️"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await createTerm(name, '', description)
    if (success) {
      setName("")
      setDescription("")
    }
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="flex flex-col gap-6 w-full">
      <PageHeader
        title={`${icon} ${title}`}
        subtitle={isCategory
          ? "Organize seus posts em categorias para facilitar a navegação."
          : "Use tags para relacionar posts por assuntos específicos."}
      />

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* ── Add Form ── */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-surface/40 border border-border rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold text-text">Adicionar {singular}</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">
                  Nome <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={`${inputCls} max-w-none`}
                  placeholder={`Nome da ${singular}`}
                />
                <p className="text-[10px] text-text-muted">Como aparecerá no seu site.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary">Descrição</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className={`${textareaCls} max-w-none min-h-[70px]`}
                  placeholder="Descrição opcional..."
                />
                <p className="text-[10px] text-text-muted">Não é exibida por padrão no tema.</p>
              </div>

              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="w-full flex items-center justify-center gap-2 bg-primary-gradient text-white font-semibold text-xs px-4 py-2.5 rounded-xl hover:shadow-neon transition-all duration-200 disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                    Adicionando...
                  </>
                ) : `+ Adicionar ${singular}`}
              </button>
            </form>
          </div>
        </div>

        {/* ── Terms Table ── */}
        <div className="flex-1 w-full">
          <div className="bg-surface/40 border border-border rounded-2xl overflow-hidden">
            {terms.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                <span className="text-4xl opacity-30">{icon}</span>
                <p className="text-sm text-text-muted">Nenhuma {singular.toLowerCase()} encontrada.</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="text-left px-5 py-3 text-text-secondary font-semibold">Nome</th>
                    <th className="text-left px-5 py-3 text-text-secondary font-semibold hidden md:table-cell">Descrição</th>
                    <th className="text-left px-5 py-3 text-text-secondary font-semibold hidden sm:table-cell">Slug</th>
                    <th className="text-center px-5 py-3 text-text-secondary font-semibold">Posts</th>
                  </tr>
                </thead>
                <tbody>
                  {terms.map((term, i) => (
                    <tr key={term.id} className={`border-b border-border/30 hover:bg-white/[0.02] transition-colors ${i % 2 === 0 ? '' : 'bg-white/[0.01]'}`}>
                      <td className="px-5 py-3 font-semibold text-primary-light">{term.name}</td>
                      <td className="px-5 py-3 text-text-muted hidden md:table-cell">{term.description || '—'}</td>
                      <td className="px-5 py-3 text-text-muted hidden sm:table-cell font-mono">{term.slug}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary-light font-bold">
                          {term.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditTagsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EditTagsContent />
    </Suspense>
  )
}
