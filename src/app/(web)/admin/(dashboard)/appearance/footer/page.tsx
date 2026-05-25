"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useOptions } from "@/hooks/useOptions"
import { LayoutTemplate, AlertCircle } from "lucide-react"
import { Card } from "@/components/admin/Card"
import { GlassButton } from "@/components/admin/GlassButton"

const PuckBuilder = dynamic(() => import('@/components/admin/PuckBuilder'), { 
  ssr: false, 
  loading: () => <div className="h-[600px] border border-border rounded-2xl bg-white/[0.01] flex items-center justify-center text-xs text-text-muted">Iniciando Visual Builder...</div> 
})

export default function FooterEditorPage() {
  const { options, updateOption, isLoading } = useOptions(['site_footer_content'])
  const [footerData, setFooterData] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isLoading && options['site_footer_content']) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFooterData(prev => prev === options['site_footer_content'] ? prev : options['site_footer_content'])
    }
  }, [isLoading, options])

  const handlePublish = async (data: any) => {
    setIsSaving(true)
    try {
      const jsonString = JSON.stringify(data)
      await updateOption('site_footer_content', jsonString)
      setFooterData(jsonString)
      alert("Footer salvo com sucesso!")
    } catch (err) {
      console.error(err)
      alert("Erro ao salvar o footer.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold text-text leading-tight flex items-center gap-2">
            <LayoutTemplate className="text-primary" /> Footer Builder
          </h1>
          <p className="text-sm text-text-muted mt-1">Crie e gerencie o layout global do rodapé do seu site.</p>
        </div>
      </div>

      <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="text-primary shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-primary-light">
          <strong>Atenção:</strong> O conteúdo abaixo será exibido globalmente em todas as páginas do site através do componente <code>{'<Footer />'}</code>. 
          Qualquer alteração feita aqui afetará a aparência pública imediatamente após salvar.
        </div>
      </div>

      <Card className="p-1 overflow-hidden border border-border shadow-soft bg-surface/50">
        {!isLoading && (
          <PuckBuilder 
            initialData={footerData} 
            onPublish={handlePublish} 
          />
        )}
      </Card>
    </div>
  )
}
