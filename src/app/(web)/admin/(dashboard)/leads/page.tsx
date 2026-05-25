import { Metadata } from 'next'
import prisma from '@/lib/prisma'
import { Card } from '@/components/admin/Card'
import { Users, Mail, Clock, ChevronRight, Download } from 'lucide-react'
import Link from 'next/link'
// @ts-ignore - TS Server cache issue in VS Code
import { LeadsActions } from './LeadsActions'

export const metadata: Metadata = {
  title: 'Leads & Submissões | NodePress',
}

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ formId?: string, status?: string }> }) {
  const { formId, status } = await searchParams

  const where: any = {}
  if (formId) where.formId = formId
  if (status) where.status = status

  let submissions: any[] = []
  try {
    // @ts-ignore - Prisma Client Types Sync Issue in IDE
    if (!prisma.formSubmission) {
      console.error('[LeadsPage] prisma.formSubmission is undefined! Keys:', Object.keys(prisma))
    } else {
      // @ts-ignore - Prisma Client Types Sync Issue in IDE
      submissions = await prisma.formSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 500 // Increased limit for export
      })
    }
  } catch (err) {
    console.error('[LeadsPage] Prisma Error:', err)
  }

  // To get form names, we fetch the corresponding form posts
  // Fetch ALL form posts to populate the filter dropdown
  const forms = await prisma.post.findMany({
    where: { postType: 'form' },
    select: { id: true, postTitle: true }
  })

  const formMap = new Map(forms.map(f => [f.id.toString(), f.postTitle]))

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold text-text leading-tight flex items-center gap-2">
            <Users className="text-primary" /> Leads & Submissões
          </h1>
          <p className="text-sm text-text-muted mt-1">Visualize e gerencie as respostas de formulários.</p>
        </div>
        <div className="flex gap-2">
          <Link 
            href={`/api/export/leads?formId=${formId || ''}&status=${status || ''}`}
            className="flex items-center gap-2 px-4 py-2 bg-background-secondary border border-border text-text rounded-xl hover:bg-white/5 transition-colors text-sm font-semibold"
            target="_blank"
          >
            <Download size={16} /> Exportar CSV
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-text-muted">Leads Encontrados</p>
            <p className="text-2xl font-bold text-text">{submissions.length}</p>
          </div>
        </Card>
        
        {/* Filters Area */}
        <Card className="p-5 md:col-span-2 flex items-center justify-end gap-4 bg-background-secondary/50">
           <LeadsActions forms={forms.map(f => ({ id: f.id.toString(), title: f.postTitle }))} currentFormId={formId} currentStatus={status} />
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text-secondary border-collapse">
            <thead className="text-xs uppercase bg-background-secondary/50 text-text-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold">Data</th>
                <th className="px-6 py-4 font-bold">Formulário</th>
                <th className="px-6 py-4 font-bold">Email</th>
                <th className="px-6 py-4 font-bold">Dados</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : (
                submissions.map(sub => {
                  let payload: any = {}
                  try { payload = JSON.parse(sub.payload) } catch (e) {}

                  return (
                    <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-text">
                          <Clock size={14} className="text-text-muted" />
                          {new Date(sub.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-text">
                        {formMap.get(sub.formId) || `Form #${sub.formId}`}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-text-muted" />
                          {payload.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-text-muted max-w-[200px] truncate">
                          {Object.entries(payload)
                            .filter(([k]) => k !== 'email' && k !== '_metadata')
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ') || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sub.status === 'unread' ? 'bg-warning/10 text-warning border border-warning/20' : 'bg-success/10 text-success border border-success/20'}`}>
                          {sub.status === 'unread' ? 'Não Lido' : 'Lido'}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
