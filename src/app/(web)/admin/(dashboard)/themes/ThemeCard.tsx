"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/admin/Card'
import { CheckCircle, Loader2 } from 'lucide-react'

interface ThemeCardProps {
  theme: {
    slug: string
    name: string
    description: string
    author: string
    version: string
  }
  isActive: boolean
}

export function ThemeCard({ theme, isActive }: ThemeCardProps) {
  const [isActivating, setIsActivating] = useState(false)
  const router = useRouter()

  const handleActivate = async () => {
    setIsActivating(true)
    try {
      const res = await fetch('/api/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_theme: theme.slug })
      })

      if (res.ok) {
        router.refresh()
      } else {
        alert('Erro ao ativar tema.')
        setIsActivating(false)
      }
    } catch (err) {
      alert('Erro ao ativar tema.')
      setIsActivating(false)
    }
  }

  return (
    <Card className={`overflow-hidden flex flex-col transition-all duration-300 ${isActive ? 'ring-2 ring-primary border-transparent' : 'border-border hover:border-primary/50'}`}>
      <div className="aspect-video bg-background-secondary flex items-center justify-center border-b border-border relative">
        <div className="text-4xl opacity-20 font-bold uppercase tracking-widest">{theme.slug}</div>
        {isActive && (
          <div className="absolute top-3 right-3 bg-primary text-white p-1 rounded-full shadow-lg">
            <CheckCircle size={20} />
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-lg text-text">{theme.name}</h3>
          <span className="text-xs text-text-muted bg-white/5 px-2 py-1 rounded-md">v{theme.version}</span>
        </div>
        <p className="text-sm text-text-secondary flex-1 mb-4">{theme.description}</p>
        <div className="text-xs text-text-muted mb-4">
          Por: <span className="text-text">{theme.author}</span>
        </div>
        
        <button 
          onClick={handleActivate}
          disabled={isActive || isActivating}
          className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            isActive 
              ? 'bg-primary/20 text-primary cursor-default' 
              : 'bg-white/5 text-text hover:bg-white/10 hover:text-white border border-border'
          }`}
        >
          {isActivating ? (
            <><Loader2 size={16} className="animate-spin" /> Ativando...</>
          ) : isActive ? (
            'Ativo'
          ) : (
            'Ativar Tema'
          )}
        </button>
      </div>
    </Card>
  )
}
