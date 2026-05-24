"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader, SettingsSection, inputCls } from "@/components/admin/SettingsUI"
import { Check, Loader2 } from "lucide-react"

export default function NewFormPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return alert("Digite um título para o formulário")
    
    setIsSaving(true)
    
    // Default empty schema for a form
    const defaultSchema = [
      { name: "nome", label: "Nome", type: "text", required: true },
      { name: "email", label: "E-mail", type: "email", required: true },
      { name: "mensagem", label: "Mensagem", type: "textarea", required: true }
    ]

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: JSON.stringify(defaultSchema),
          type: 'form',
          status: 'publish'
        })
      })

      if (res.ok) {
        const { post } = await res.json()
        router.push(`/admin/forms/${post.id}/edit`)
      } else {
        alert("Erro ao criar formulário")
      }
    } catch (e) {
      alert("Erro ao criar formulário")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      <PageHeader title="Novo Formulário" subtitle="Crie um novo formulário de contato ou captação." />

      <SettingsSection title="Informações Básicas">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">Nome do Formulário</label>
          <input 
            type="text"
            className={inputCls}
            placeholder="Ex: Contato Principal"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <button 
          onClick={handleCreate}
          disabled={isSaving}
          className="mt-4 flex items-center justify-center gap-2 bg-primary-gradient text-white font-bold px-6 py-3 rounded-xl hover:shadow-neon transition-all disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {isSaving ? "Criando..." : "Criar e Configurar Campos"}
        </button>
      </SettingsSection>
    </div>
  )
}
