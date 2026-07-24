"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PageHeader, SettingsSection, inputCls, selectCls } from "@/components/admin/SettingsUI"
import { Check, Loader2, List, Settings, Inbox, Trash2 } from "lucide-react"

export default function FormEditor({ form, submissions }: { form: any, submissions: any[] }) {
  const router = useRouter()
  const [title, setTitle] = useState(form.postTitle || "")
  const [fields, setFields] = useState<any[]>(() => {
    try { return JSON.parse(form.postContent) } catch(e) { return [] }
  })
  const [activeTab, setActiveTab] = useState<'editor' | 'submissions'>('editor')
  const [isSaving, setIsSaving] = useState(false)
  const [isAdmissionForm, setIsAdmissionForm] = useState<boolean>(
    () => form.meta?.find((m: any) => m.metaKey === '_np_form_kind')?.metaValue === 'admission'
  )
  const [processId, setProcessId] = useState<string>(
    () => form.meta?.find((m: any) => m.metaKey === '_np_admission_process_id')?.metaValue || ''
  )
  const [modality, setModality] = useState<string>(
    () => form.meta?.find((m: any) => m.metaKey === '_np_admission_modality')?.metaValue || ''
  )
  const [processes, setProcesses] = useState<any[]>([])
  const [loadingProcesses, setLoadingProcesses] = useState(false)

  useEffect(() => {
    if (!isAdmissionForm) return
    setLoadingProcesses(true)
    fetch('/api/admissions/processes')
      .then(res => res.json())
      .then(data => setProcesses(Array.isArray(data) ? data : []))
      .catch(() => setProcesses([]))
      .finally(() => setLoadingProcesses(false))
  }, [isAdmissionForm])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetch(`/api/posts/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: JSON.stringify(fields),
          metaData: {
            _np_form_kind: isAdmissionForm ? 'admission' : '',
            _np_admission_process_id: isAdmissionForm ? processId : '',
            _np_admission_modality: isAdmissionForm ? modality : '',
          }
        })
      })
      alert("Formulário salvo!")
      router.refresh()
    } catch (e) {
      alert("Erro ao salvar")
    } finally {
      setIsSaving(false)
    }
  }

  const addField = () => {
    setFields([...fields, { name: `campo_${Date.now()}`, label: "Novo Campo", type: "text", required: false }])
  }

  const updateField = (idx: number, key: string, val: any) => {
    const copy = [...fields]
    copy[idx][key] = val
    setFields(copy)
  }

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx))
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl">
      <div className="flex items-center justify-between">
        <PageHeader title="Editor de Formulário" subtitle="Construa os campos e veja as respostas recebidas." />
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-primary-gradient text-white font-bold px-5 py-2.5 rounded-xl hover:shadow-neon transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border/40 pb-2">
        <button 
          onClick={() => setActiveTab('editor')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'editor' ? 'border-primary text-text' : 'border-transparent text-text-muted hover:text-text-secondary'}`}
        >
          <Settings size={16} /> Campos do Formulário
        </button>
        <button 
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm transition-colors border-b-2 ${activeTab === 'submissions' ? 'border-primary text-text' : 'border-transparent text-text-muted hover:text-text-secondary'}`}
        >
          <Inbox size={16} /> Respostas ({submissions.length})
        </button>
      </div>

      {activeTab === 'editor' ? (
        <div className="flex flex-col gap-6">
          <SettingsSection title="Configurações">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Nome do Formulário</label>
              <input 
                type="text"
                className={inputCls}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Shortcode (Copie e cole no Puck)</label>
              <code className="bg-black/30 p-3 rounded-lg text-primary-light font-mono text-sm border border-border/50">
                ID: {form.id}
              </code>
            </div>
          </SettingsSection>

          <SettingsSection title="Integração com Admissões">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={isAdmissionForm}
                onChange={e => setIsAdmissionForm(e.target.checked)}
                className="rounded border-border bg-black/50 text-primary"
              />
              Este formulário captura candidatos (cria Lead no processo seletivo)
            </label>

            {isAdmissionForm && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Processo Seletivo</label>
                  <select value={processId} onChange={e => setProcessId(e.target.value)} className={selectCls}>
                    <option value="">{loadingProcesses ? "Carregando..." : "Selecione um processo"}</option>
                    {processes.map((p: any) => (
                      <option key={p.ID} value={p.ID}>{p.Name} ({p.Term})</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Modalidade</label>
                  <select value={modality} onChange={e => setModality(e.target.value)} className={selectCls}>
                    <option value="">Selecione a modalidade</option>
                    <option value="ENEM">ENEM</option>
                    <option value="VESTIBULAR">Vestibular</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                    <option value="PORTADOR_DIPLOMA">Portador de Diploma</option>
                  </select>
                </div>
                <p className="text-xs text-text-muted">
                  Para este formulário criar candidatos corretamente, os campos devem usar os nomes internos
                  <code className="mx-1 bg-black/30 px-1.5 py-0.5 rounded">name</code>,
                  <code className="mx-1 bg-black/30 px-1.5 py-0.5 rounded">email</code> e
                  <code className="mx-1 bg-black/30 px-1.5 py-0.5 rounded">phone</code>.
                </p>
              </div>
            )}
          </SettingsSection>

          <SettingsSection title="Campos (Drag & Drop em breve)">
            <div className="flex flex-col gap-3">
              {fields.map((f, idx) => (
                <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-white/5 p-4 rounded-xl border border-border/50">
                  <div className="w-full md:w-auto flex-1">
                    <label className="text-[10px] text-text-muted uppercase font-bold">Label Exibida</label>
                    <input type="text" value={f.label} onChange={e => updateField(idx, 'label', e.target.value)} className={inputCls} />
                  </div>
                  <div className="w-full md:w-auto flex-1">
                    <label className="text-[10px] text-text-muted uppercase font-bold">Nome Variável (Interno)</label>
                    <input type="text" value={f.name} onChange={e => updateField(idx, 'name', e.target.value)} className={inputCls + " font-mono text-xs"} />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="text-[10px] text-text-muted uppercase font-bold">Tipo</label>
                    <select value={f.type} onChange={e => updateField(idx, 'type', e.target.value)} className={selectCls}>
                      <option value="text">Texto Curto</option>
                      <option value="email">E-mail</option>
                      <option value="textarea">Texto Longo</option>
                      <option value="number">Número</option>
                      <option value="checkbox">Caixa (Sim/Não)</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-4">
                    <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                      <input type="checkbox" checked={f.required} onChange={e => updateField(idx, 'required', e.target.checked)} className="rounded border-border bg-black/50 text-primary" />
                      Obrigatório
                    </label>
                  </div>
                  <button onClick={() => removeField(idx)} className="ml-auto pt-4 text-text-muted hover:text-danger p-2" title="Remover Campo">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              
              <button onClick={addField} className="mt-2 self-start text-xs font-bold text-primary hover:text-primary-light transition-colors flex items-center gap-1">
                + Adicionar Campo
              </button>
            </div>
          </SettingsSection>
        </div>
      ) : (
        <SettingsSection title="Respostas Recebidas">
          {submissions.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm border border-border/50 rounded-xl bg-black/20">
              Nenhuma resposta recebida ainda.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {submissions.map(sub => {
                let data = {}
                try { data = JSON.parse(sub.postContent) } catch(e) {}
                
                return (
                  <div key={sub.id} className="bg-white/[0.02] border border-border/50 rounded-xl p-5 flex flex-col gap-3">
                    <div className="flex justify-between items-center text-xs text-text-muted border-b border-border/30 pb-2 mb-1">
                      <span>Recebido em: {new Date(sub.postDate).toLocaleString('pt-BR')}</span>
                      <span>IP/Origem: {sub.postExcerpt || 'Desconhecida'}</span>
                    </div>
                    {Object.entries(data).map(([k, v]) => (
                      <div key={k} className="text-sm">
                        <span className="font-bold text-text-secondary capitalize block text-[10px] uppercase tracking-wider mb-0.5">{k}</span>
                        <span className="text-text">{v as React.ReactNode || '-'}</span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </SettingsSection>
      )}
    </div>
  )
}
