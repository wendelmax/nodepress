"use client"
// Component for leads actions

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, X } from 'lucide-react'

interface LeadsActionsProps {
  forms: { id: string, title: string }[]
  currentFormId?: string
  currentStatus?: string
}

export function LeadsActions({ forms, currentFormId, currentStatus }: LeadsActionsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/admin/leads?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push(`/admin/leads`)
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-text-muted" />
        <span className="text-sm font-semibold text-text">Filtros:</span>
      </div>

      <select 
        className="bg-background border border-border text-text text-sm rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors"
        value={currentFormId || ''}
        onChange={(e) => handleFilter('formId', e.target.value)}
      >
        <option value="">Todos os Formulários</option>
        {forms.map(f => (
          <option key={f.id} value={f.id}>{f.title}</option>
        ))}
      </select>

      <select 
        className="bg-background border border-border text-text text-sm rounded-xl px-3 py-2 outline-none focus:border-primary transition-colors"
        value={currentStatus || ''}
        onChange={(e) => handleFilter('status', e.target.value)}
      >
        <option value="">Todos os Status</option>
        <option value="unread">Não Lido</option>
        <option value="read">Lido</option>
      </select>

      {(currentFormId || currentStatus) && (
        <button 
          onClick={clearFilters}
          className="flex items-center gap-1 px-3 py-2 text-sm text-warning hover:bg-warning/10 rounded-xl transition-colors"
        >
          <X size={14} /> Limpar
        </button>
      )}
    </div>
  )
}
