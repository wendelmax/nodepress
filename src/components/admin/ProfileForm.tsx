"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react"
import {
  PageHeader, SettingsSection, FieldRow, SaveButton, StatusMessage,
  inputCls, selectCls
} from "@/components/admin/SettingsUI"

export default function ProfileForm({ user }: { user: any }) {
  const router = useRouter()
  const userRole = user.meta?.find((m: any) => m.metaKey === 'capabilities')?.metaValue || 'administrator'

  const [formData, setFormData] = useState({
    email: user.userEmail || '',
    displayName: user.displayName || '',
    url: user.userUrl || '',
    role: userRole,
    newPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const set = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error()
      setStatus({ type: 'success', message: 'Perfil atualizado com sucesso.' })
      set('newPassword', '')
      router.refresh()
    } catch {
      setStatus({ type: 'error', message: 'Ocorreu um erro ao atualizar o perfil.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl">
      <PageHeader title="Meu Perfil" subtitle="Gerencie suas informações pessoais, contato e segurança da conta." />

      {status && <StatusMessage type={status.type} text={status.message} />}

      {/* Avatar preview */}
      <div className="flex items-center gap-4 bg-surface/40 border border-border rounded-2xl p-5">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-black text-primary-light flex-shrink-0">
          {user.userLogin.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-bold text-text">{user.displayName || user.userLogin}</div>
          <div className="text-xs text-text-muted mt-0.5">@{user.userLogin}</div>
          <div className="mt-1.5">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-accent-purple/10 border border-accent-purple/20 text-accent-purple capitalize">
              {userRole}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Name section */}
        <SettingsSection title="Identidade" icon={<User size={18} />}>
          <FieldRow label="Usuário" hint="Nomes de usuário não podem ser alterados.">
            <input
              type="text"
              value={user.userLogin}
              disabled
              className={`${inputCls} opacity-50 cursor-not-allowed bg-white/5`}
            />
          </FieldRow>

          <FieldRow label="Nome de Exibição">
            <input
              type="text"
              value={formData.displayName}
              onChange={e => set('displayName', e.target.value)}
              className={inputCls}
              placeholder="Seu nome público"
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

        {/* Contact section */}
        <SettingsSection title="Informações de Contato" icon={<Mail size={18} />}>
          <FieldRow label="E-mail" required>
            <input
              type="email"
              required
              value={formData.email}
              onChange={e => set('email', e.target.value)}
              className={inputCls}
              placeholder="seu@email.com"
            />
          </FieldRow>

          <FieldRow label="Website">
            <input
              type="url"
              value={formData.url}
              onChange={e => set('url', e.target.value)}
              className={inputCls}
              placeholder="https://seusite.com"
            />
          </FieldRow>
        </SettingsSection>

        {/* Password section */}
        <SettingsSection title="Segurança" icon={<Lock size={18} />}>
          <FieldRow label="Nova Senha" hint="Deixe em branco para manter a senha atual.">
            <div className="relative max-w-md">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={e => set('newPassword', e.target.value)}
                placeholder="Deixe em branco para manter a atual"
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </FieldRow>
        </SettingsSection>

        <SaveButton isSaving={isSaving} label="Atualizar Perfil" />
      </form>
    </div>
  )
}
