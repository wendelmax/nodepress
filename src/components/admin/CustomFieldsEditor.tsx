"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export interface CustomField {
  name: string
  label: string
  type: 'text' | 'textarea' | 'number' | 'url'
}

export interface FieldGroup {
  id: string
  title: string
  postType: string
  fields: CustomField[]
}

export default function CustomFieldsEditor() {
  const router = useRouter()
  const [groups, setGroups] = useState<FieldGroup[]>([])
  const [cpts, setCpts] = useState<string[]>(['post', 'page'])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Fetch both field groups and CPTs
    fetch('/api/options?keys=acf_field_groups,np_cpt_registry')
      .then(res => res.json())
      .then(data => {
        if (data.acf_field_groups) {
          try {
            setGroups(JSON.parse(data.acf_field_groups))
          } catch (e) {
            console.error("Failed to parse field groups")
          }
        }
        
        if (data.np_cpt_registry) {
          try {
            const registry = JSON.parse(data.np_cpt_registry)
            setCpts(['post', 'page', ...registry.map((c: any) => c.slug)])
          } catch (e) {}
        }
        setIsLoading(false)
      })
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acf_field_groups: JSON.stringify(groups) })
      })

      if (res.ok) {
        alert('Grupos de Campos salvos com sucesso!')
        router.refresh()
      } else {
        alert('Falha ao salvar Grupos de Campos.')
      }
    } catch (e) {
      alert('Erro ao salvar Grupos de Campos.')
    } finally {
      setIsSaving(false)
    }
  }

  const addGroup = () => {
    const newGroup: FieldGroup = {
      id: `group_${Date.now()}`,
      title: 'Novo Grupo',
      postType: 'post',
      fields: []
    }
    setGroups([...groups, newGroup])
  }

  const removeGroup = (index: number) => {
    if (confirm('Remover este grupo de campos? Os dados salvos nos posts não serão apagados do banco.')) {
      const copy = [...groups]
      copy.splice(index, 1)
      setGroups(copy)
    }
  }

  const updateGroup = (index: number, key: keyof FieldGroup, value: any) => {
    const copy = [...groups]
    copy[index] = { ...copy[index], [key]: value }
    setGroups(copy)
  }

  const addField = (groupIndex: number) => {
    const copy = [...groups]
    copy[groupIndex].fields.push({
      name: `_field_${Date.now()}`,
      label: 'Novo Campo',
      type: 'text'
    })
    setGroups(copy)
  }

  const updateField = (groupIndex: number, fieldIndex: number, key: keyof CustomField, value: any) => {
    const copy = [...groups]
    copy[groupIndex].fields[fieldIndex] = { ...copy[groupIndex].fields[fieldIndex], [key]: value }
    setGroups(copy)
  }

  const removeField = (groupIndex: number, fieldIndex: number) => {
    const copy = [...groups]
    copy[groupIndex].fields.splice(fieldIndex, 1)
    setGroups(copy)
  }

  if (isLoading) return <div className="p-5 text-text-muted">Carregando...</div>

  return (
    <div className="max-w-4xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Campos Customizados (ACF)</h1>
          <p className="text-text-muted text-sm mt-1">Crie grupos de campos meta adicionais para Posts, Páginas ou CPTs.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={addGroup}
            className="px-4 py-2 rounded-xl border border-border bg-white/5 hover:bg-white/10 text-text-secondary hover:text-white transition-colors text-sm font-semibold"
          >
            + Criar Grupo
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

      {groups.length === 0 ? (
        <div className="border border-border rounded-2xl bg-white/[0.02] p-8 text-center text-text-muted">
          Nenhum grupo de campos registrado. Clique em &quot;+ Criar Grupo&quot;.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((group, idx) => (
            <div key={group.id} className="border border-border rounded-2xl bg-white/[0.02] p-5 flex flex-col gap-4 relative">
              <button 
                onClick={() => removeGroup(idx)}
                className="absolute top-4 right-4 text-text-muted hover:text-danger transition-colors text-xl leading-none"
                title="Remover Grupo"
              >
                &times;
              </button>

              <div className="flex gap-4 items-end border-b border-border/50 pb-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-text-secondary">Título do Grupo</label>
                  <input 
                    type="text" 
                    value={group.title} 
                    onChange={(e) => updateGroup(idx, 'title', e.target.value)}
                    className="w-full bg-white/[0.05] border border-border rounded-xl px-3 py-2 text-sm text-text outline-none focus:border-primary/50"
                    placeholder="Ex: Configurações do Produto"
                  />
                </div>
                <div className="flex flex-col gap-1.5 w-1/3">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-text-secondary">Aplicar ao Tipo</label>
                  <select
                    value={group.postType}
                    onChange={(e) => updateGroup(idx, 'postType', e.target.value)}
                    className="w-full bg-black/20 border border-border rounded-xl px-3 py-2 text-sm text-text-muted outline-none focus:border-primary/50"
                  >
                    {cpts.map(cpt => <option key={cpt} value={cpt}>{cpt}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-bold tracking-widest uppercase text-text-secondary">Campos deste Grupo</label>
                
                {group.fields.length === 0 ? (
                  <div className="text-xs text-text-muted">Sem campos.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {group.fields.map((field, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-border/50">
                        <input 
                          type="text" 
                          value={field.label} 
                          onChange={(e) => updateField(idx, fIdx, 'label', e.target.value)}
                          placeholder="Label do Campo (Ex: Preço)"
                          className="flex-1 bg-transparent border-b border-border/50 px-2 py-1 text-xs text-text outline-none focus:border-primary/50"
                        />
                        <input 
                          type="text" 
                          value={field.name} 
                          onChange={(e) => updateField(idx, fIdx, 'name', e.target.value)}
                          placeholder="Nome (Ex: _preco)"
                          className="flex-1 bg-transparent border-b border-border/50 px-2 py-1 text-xs text-text-muted font-mono outline-none focus:border-primary/50"
                        />
                        <select
                          value={field.type}
                          onChange={(e) => updateField(idx, fIdx, 'type', e.target.value as any)}
                          className="w-32 bg-black/40 border border-border/50 rounded-lg px-2 py-1 text-xs text-text-muted outline-none focus:border-primary/50"
                        >
                          <option value="text">Texto</option>
                          <option value="textarea">Texto Longo</option>
                          <option value="number">Número</option>
                          <option value="url">URL</option>
                        </select>
                        <button 
                          onClick={() => removeField(idx, fIdx)}
                          className="text-text-muted hover:text-danger px-2"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <button 
                  onClick={() => addField(idx)}
                  className="self-start text-xs font-semibold text-primary hover:text-primary-light transition-colors mt-1"
                >
                  + Adicionar Campo
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
