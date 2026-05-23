"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export interface CustomPostType {
  slug: string
  singularName: string
  pluralName: string
  icon: string
  public: boolean
}

export default function CPTEditor() {
  const router = useRouter()
  const [cpts, setCpts] = useState<CustomPostType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch('/api/options?keys=np_cpt_registry')
      .then(res => res.json())
      .then(data => {
        if (data.np_cpt_registry) {
          try {
            setCpts(JSON.parse(data.np_cpt_registry))
          } catch (e) {
            console.error("Failed to parse CPT registry")
          }
        }
        setIsLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Validate slugs (no spaces, special chars)
      const validCpts = cpts.map(cpt => ({
        ...cpt,
        slug: cpt.slug.toLowerCase().replace(/[^a-z0-9_-]/g, '')
      }))

      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ np_cpt_registry: JSON.stringify(validCpts) })
      })

      if (res.ok) {
        alert('Tipos de Post salvos com sucesso!')
        router.refresh()
      } else {
        alert('Falha ao salvar Tipos de Post.')
      }
    } catch (e) {
      alert('Erro ao salvar Tipos de Post.')
    } finally {
      setIsSaving(false)
    }
  }

  const addCPT = () => {
    const newCPT: CustomPostType = {
      slug: `custom_${Date.now()}`,
      singularName: 'Novo Tipo',
      pluralName: 'Novos Tipos',
      icon: '📝',
      public: true
    }
    setCpts([...cpts, newCPT])
  }

  const removeCPT = (index: number) => {
    if (confirm('Tem certeza? Isso removerá o tipo do menu, mas NÃO deletará os posts já criados do banco de dados.')) {
      const copy = [...cpts]
      copy.splice(index, 1)
      setCpts(copy)
    }
  }

  const updateCPT = (index: number, key: keyof CustomPostType, value: any) => {
    const copy = [...cpts]
    copy[index] = { ...copy[index], [key]: value }
    setCpts(copy)
  }

  if (isLoading) return <div className="p-5 text-text-muted">Carregando...</div>

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Custom Post Types</h1>
          <p className="text-text-muted text-sm mt-1">Crie novos tipos de conteúdo (ex: Portfólios, Eventos, Produtos) para o seu NodePress.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={addCPT}
            className="px-4 py-2 rounded-xl border border-border bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors text-sm font-semibold"
          >
            + Adicionar CPT
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-primary-gradient text-white font-bold rounded-xl hover:shadow-neon transition-all text-sm disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {cpts.length === 0 ? (
        <div className="border border-border rounded-2xl bg-white/[0.02] p-8 text-center text-text-muted">
          Nenhum Custom Post Type registrado. Clique em "+ Adicionar CPT" para criar o primeiro.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cpts.map((cpt, idx) => (
            <div key={idx} className="border border-border rounded-2xl bg-white/[0.02] p-5 flex flex-col gap-4 relative">
              <button 
                onClick={() => removeCPT(idx)}
                className="absolute top-4 right-4 text-text-muted hover:text-danger transition-colors text-xl leading-none"
                title="Remover"
              >
                &times;
              </button>

              <div className="flex gap-4 items-end">
                <div className="flex flex-col gap-1.5 w-16">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-text-secondary">Ícone</label>
                  <input 
                    type="text" 
                    value={cpt.icon} 
                    onChange={(e) => updateCPT(idx, 'icon', e.target.value)}
                    className="w-full bg-white/[0.05] border border-border rounded-xl px-2 py-2 text-center text-lg outline-none focus:border-primary/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-text-secondary">Slug (ID único)</label>
                  <input 
                    type="text" 
                    value={cpt.slug} 
                    onChange={(e) => updateCPT(idx, 'slug', e.target.value)}
                    className="w-full bg-black/20 border border-border rounded-xl px-3 py-2 text-sm text-text-muted outline-none focus:border-primary/50 font-mono"
                    placeholder="portfolio"
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-text-secondary">Nome Singular</label>
                  <input 
                    type="text" 
                    value={cpt.singularName} 
                    onChange={(e) => updateCPT(idx, 'singularName', e.target.value)}
                    className="w-full bg-white/[0.05] border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-primary/50"
                    placeholder="Portfólio"
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-text-secondary">Nome Plural</label>
                  <input 
                    type="text" 
                    value={cpt.pluralName} 
                    onChange={(e) => updateCPT(idx, 'pluralName', e.target.value)}
                    className="w-full bg-white/[0.05] border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-primary/50"
                    placeholder="Portfólios"
                  />
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
