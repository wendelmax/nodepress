"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader, SettingsSection, FieldRow, SaveButton, StatusMessage, inputCls, selectCls } from "@/components/admin/SettingsUI"
import Link from "next/link"

export default function NewUserPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    userLogin: '',
    email: '',
    displayName: '',
    password: '',
    role: 'subscriber'
  })
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const set = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setStatus(null)
    
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar usuário')
      }
      
      setStatus({ type: 'success', message: 'Usuário criado com sucesso!' })
      setTimeout(() => {
        router.push('/admin/users')
        router.refresh()
      }, 1000)
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/users" className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-secondary hover:text-white hover:bg-white/5 transition-colors no-underline">
          ←
        </Link>
        <PageHeader title="Adicionar Novo Usuário" subtitle="Crie uma nova conta de acesso ao painel com papel específico." />
      </div>

      {status && <StatusMessage type={status.type} text={status.message} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <SettingsSection title="Dados de Acesso" icon="🔐">
          <FieldRow label="Nome de Usuário (Login)" required hint="Não poderá ser alterado depois.">
            <input
              type="text"
              required
              value={formData.userLogin}
              onChange={e => set('userLogin', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className={inputCls}
              placeholder="ex: joaosilva"
            />
          </FieldRow>

          <FieldRow label="E-mail" required>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => set('email', e.target.value)}
              className={inputCls}
              placeholder="email@exemplo.com"
            />
          </FieldRow>

          <FieldRow label="Senha" required>
            <input
              type="password"
              required
              value={formData.password}
              onChange={e => set('password', e.target.value)}
              className={inputCls}
              placeholder="Defina uma senha forte"
            />
          </FieldRow>
        </SettingsSection>

        <SettingsSection title="Informações do Perfil" icon="👤">
          <FieldRow label="Nome de Exibição" hint="Nome que aparecerá publicamente nos posts.">
            <input
              type="text"
              value={formData.displayName}
              onChange={e => set('displayName', e.target.value)}
              className={inputCls}
              placeholder="Nome Completo"
            />
          </FieldRow>

          <FieldRow label="Papel">
            <select
              value={formData.role}
              onChange={e => set('role', e.target.value)}
              className={selectCls}
            >
              <option value="administrator">Administrador</option>
              <option value="editor">Editor</option>
              <option value="author">Autor</option>
              <option value="contributor">Colaborador</option>
              <option value="subscriber">Assinante</option>
            </select>
          </FieldRow>
        </SettingsSection>

        <SaveButton isSaving={isSaving} label="Criar Usuário" />
      </form>
    </div>
  )
}
