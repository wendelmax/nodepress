"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

export function FormEmbed({ formId }: { formId: string }) {
  const [fields, setFields] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  // Fetch form structure
  useEffect(() => {
    if (!formId) return
    fetch(`/api/posts/${formId}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.postType === 'form' && data.postContent) {
          try {
            setFields(JSON.parse(data.postContent))
          } catch(e) {}
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [formId])

  if (!formId) return <div className="p-4 border border-border bg-white/5 rounded-xl text-center text-text-muted text-sm">Selecione um formulário nas opções do bloco.</div>
  
  if (loading) return <div className="p-4 text-center"><Loader2 className="animate-spin mx-auto text-primary" /></div>
  if (fields.length === 0) return <div className="p-4 border border-border bg-white/5 rounded-xl text-center text-text-muted text-sm">Este formulário não possui campos configurados.</div>

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setStatus(null)

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    const urlParams = new URLSearchParams(window.location.search)
    const utm: Record<string, string> = {}
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const val = urlParams.get(key)
      if (val) utm[key] = val
    }

    try {
      const res = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId, ...data, ...utm })
      })

      if (res.ok) {
        setStatus({ type: 'success', message: 'Mensagem enviada com sucesso!' })
        e.currentTarget.reset()
      } else {
        setStatus({ type: 'error', message: 'Houve um problema ao enviar.' })
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Erro de conexão.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto bg-surface border border-border rounded-2xl p-6 shadow-soft">
      {status && (
        <div className={`p-4 mb-6 rounded-xl text-sm font-semibold border ${status.type === 'success' ? 'bg-success/10 border-success/30 text-success' : 'bg-danger/10 border-danger/30 text-danger'}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {fields.map((field, idx) => (
          <div key={idx} className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-secondary">{field.label} {field.required && <span className="text-danger">*</span>}</label>
            {field.type === 'textarea' ? (
              <textarea 
                name={field.name} 
                required={field.required} 
                rows={4}
                className="w-full bg-white/[0.03] border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-primary/50 transition-all resize-y"
              />
            ) : field.type === 'checkbox' ? (
              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="checkbox" 
                  name={field.name} 
                  required={field.required}
                  className="w-4 h-4 rounded border-border bg-black/50 text-primary focus:ring-primary/50"
                />
                <span className="text-sm text-text-muted">Sim, eu concordo</span>
              </div>
            ) : (
              <input 
                type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : 'text'}
                name={field.name} 
                required={field.required} 
                className="w-full bg-white/[0.03] border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-primary/50 transition-all"
              />
            )}
          </div>
        ))}

        <button 
          type="submit" 
          disabled={submitting}
          className="mt-2 bg-primary-gradient text-white font-bold px-6 py-3.5 rounded-xl hover:shadow-neon transition-all disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {submitting && <Loader2 size={18} className="animate-spin" />}
          {submitting ? 'Enviando...' : 'Enviar Mensagem'}
        </button>
      </form>
    </div>
  )
}
