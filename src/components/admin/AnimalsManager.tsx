"use client"

import { useEffect, useState } from "react"
import { PawPrint, Pencil, Plus, Trash2 } from "lucide-react"

type AnimalRecord = {
  id: string
  title: string
  slug: string
  status: "draft" | "publish" | "archived"
  data: { name?: string; species?: string; status?: string; weight?: number }
}

const initialForm = { name: "", species: "", status: "available", weight: "" }

export function AnimalsManager() {
  const [records, setRecords] = useState<AnimalRecord[]>([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    const response = await fetch("/api/animals")
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os animais")
    setRecords(payload.records)
  }

  useEffect(() => {
    void Promise.resolve().then(load).catch((error) => setMessage(error.message)).finally(() => setLoading(false))
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)
    const data = {
      name: form.name,
      species: form.species || undefined,
      status: form.status,
      ...(form.weight ? { weight: Number(form.weight) } : {}),
    }
    const response = await fetch(editingId ? `/api/animals/${editingId}` : "/api/animals", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: form.name, data }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setMessage(payload.error || "Não foi possível salvar o animal")
    else {
      setForm(initialForm)
      setEditingId(null)
      await load()
      setMessage("Animal salvo com sucesso.")
    }
    setSaving(false)
  }

  const edit = (record: AnimalRecord) => {
    setEditingId(record.id)
    setForm({
      name: record.data.name || record.title,
      species: record.data.species || "",
      status: record.data.status || "available",
      weight: record.data.weight === undefined ? "" : String(record.data.weight),
    })
  }

  const remove = async (id: string) => {
    if (!window.confirm("Remover este animal?")) return
    const response = await fetch(`/api/animals/${id}`, { method: "DELETE" })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      setMessage(payload.error || "Não foi possível remover o animal")
      return
    }
    setRecords((current) => current.filter((record) => record.id !== id))
    setMessage("Animal removido.")
  }

  if (loading) return <p className="text-text-secondary">Carregando animais…</p>

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl">
      <div className="flex items-center gap-3 border-b border-border/40 pb-6">
        <PawPrint size={24} className="text-primary-light" />
        <div>
          <h1 className="text-2xl font-bold text-text">Animais</h1>
          <p className="text-sm text-text-secondary">Gerencie registros do tipo de conteúdo fornecido pelo plugin.</p>
        </div>
      </div>

      {message && <p className="rounded-xl border border-border bg-surface/50 px-4 py-3 text-sm text-text-secondary">{message}</p>}

      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-border bg-surface/40 p-5 md:grid-cols-4">
        <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nome" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text" />
        <input value={form.species} onChange={(event) => setForm({ ...form, species: event.target.value })} placeholder="Espécie" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text" />
        <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })} className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text">
          <option value="available">Disponível</option>
          <option value="adopted">Adotado</option>
          <option value="foster">Lar temporário</option>
        </select>
        <input type="number" min="0" step="0.1" value={form.weight} onChange={(event) => setForm({ ...form, weight: event.target.value })} placeholder="Peso (kg)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text" />
        <div className="flex gap-2 md:col-span-4">
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><Plus size={16} />{editingId ? "Atualizar" : "Adicionar"}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(initialForm) }} className="rounded-xl border border-border px-4 py-2 text-sm text-text-secondary">Cancelar</button>}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border">
        <div className="grid grid-cols-[1fr_1fr_140px_88px] gap-4 border-b border-border bg-surface/60 px-5 py-3 text-xs font-bold uppercase tracking-wider text-text-muted"><span>Nome</span><span>Espécie</span><span>Status</span><span /></div>
        {records.length === 0 && <p className="px-5 py-8 text-sm text-text-secondary">Nenhum animal cadastrado.</p>}
        {records.map((record) => <div key={record.id} className="grid grid-cols-[1fr_1fr_140px_88px] items-center gap-4 border-b border-border/60 px-5 py-4 text-sm last:border-0"><span className="font-semibold text-text">{record.data.name || record.title}</span><span className="text-text-secondary">{record.data.species || "—"}</span><span className="text-text-secondary">{record.data.status || record.status}</span><span className="flex gap-2"><button onClick={() => edit(record)} aria-label={`Editar ${record.title}`} className="text-text-muted hover:text-text"><Pencil size={16} /></button><button onClick={() => remove(record.id)} aria-label={`Remover ${record.title}`} className="text-text-muted hover:text-danger"><Trash2 size={16} /></button></span></div>)}
      </div>
    </div>
  )
}
