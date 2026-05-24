"use client"

import { useState } from "react"
import { Card } from "@/components/admin/Card"
import { StatusMessage } from "@/components/admin/SettingsUI"
import { Wrench, Upload, Download } from "lucide-react"

export default function ImportExportPage() {
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setMsg(null)
    try {
      const res = await fetch('/api/export')
      if (!res.ok) throw new Error('Falha ao exportar os dados')
      
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nodepress-export-${new Date().toISOString().slice(0,10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      
      setMsg({ type: 'success', text: 'Exportação concluída com sucesso. Verifique seus downloads.' })
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Erro durante a exportação.' })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!confirm(`Atenção: Você está prestes a importar dados do arquivo ${file.name}. Isso pode sobrescrever dados existentes. Deseja continuar?`)) {
      e.target.value = ''
      return
    }

    setIsImporting(true)
    setMsg(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      
      if (res.ok && data.success) {
        setMsg({ type: 'success', text: data.message })
      } else {
        throw new Error(data.error || 'Falha ao importar')
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Erro durante a importação.' })
    } finally {
      setIsImporting(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl">
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold text-text leading-none flex items-center gap-2">
          <Wrench size={24} className="text-primary-light" /> Ferramentas
        </h1>
        <p className="text-xs text-text-secondary mt-1.5">
          Importe ou exporte dados vitais do NodePress como um arquivo JSON.
        </p>
      </div>

      {msg && <StatusMessage type={msg.type} text={msg.text} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Card */}
        <Card className="p-6 flex flex-col gap-4 border-l-4 border-l-primary/60">
          <div className="flex items-center gap-3">
            <span className="text-3xl text-primary-light flex items-center justify-center w-8"><Upload size={28} /></span>
            <div>
              <h2 className="text-sm font-bold text-text">Exportar Dados</h2>
              <p className="text-xs text-text-muted mt-0.5">Faça um backup dos seus dados</p>
            </div>
          </div>
          
          <p className="text-xs text-text-secondary leading-relaxed flex-1">
            Ao clicar no botão abaixo, o NodePress gerará um arquivo JSON moderno contendo todos os seus posts, usuários, taxonomias e configurações do sistema. Guarde este arquivo em local seguro.
          </p>

          <button
            onClick={handleExport}
            disabled={isExporting || isImporting}
            className="w-full bg-primary/10 border border-primary/20 text-primary-light hover:bg-primary/20 py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 disabled:opacity-50"
          >
            {isExporting ? 'Gerando arquivo...' : 'Fazer Download da Exportação'}
          </button>
        </Card>

        {/* Import Card */}
        <Card className="p-6 flex flex-col gap-4 border-l-4 border-l-warning/60">
          <div className="flex items-center gap-3">
            <span className="text-3xl text-warning flex items-center justify-center w-8"><Download size={28} /></span>
            <div>
              <h2 className="text-sm font-bold text-text">Importar Dados</h2>
              <p className="text-xs text-text-muted mt-0.5">Restaure um backup existente</p>
            </div>
          </div>
          
          <p className="text-xs text-text-secondary leading-relaxed flex-1">
            Faça upload de um arquivo de exportação (.json) gerado anteriormente por um sistema NodePress. Note que dependendo do tamanho, isso pode demorar um pouco. Recomendado apenas em ambientes recém instalados.
          </p>

          <div className="relative">
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              disabled={isImporting || isExporting}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className={`w-full text-center py-2.5 rounded-xl font-semibold text-xs transition-all duration-200 ${
              isImporting 
                ? 'bg-warning/20 border-warning/30 text-warning' 
                : 'bg-white/5 border border-border text-text-secondary hover:text-white hover:bg-white/10'
            }`}>
              {isImporting ? 'Processando importação...' : 'Selecionar arquivo .JSON para Importar'}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
