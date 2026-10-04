import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { hasAdminAccess } from '@/lib/access-control.mjs'
import { PrismaLeadRepository, redactLeadData } from '@/modules/leads'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user || !hasAdminAccess((session.user as { role?: string }).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const formId = searchParams.get('formId')
  const status = searchParams.get('status')
  const canonicalFormId = formId && /^\d+$/.test(formId) ? `legacy-${formId}` : formId
  let leads = await new PrismaLeadRepository().list()
  if (formId) leads = leads.filter(lead => lead.sourceFormId === formId || lead.sourceFormId === canonicalFormId)
  if (status) leads = leads.filter(lead => lead.status === status)

  let csv = 'ID,Date,FormId,Status,Email,Payload\n'
  for (const lead of leads) {
    const payload = redactLeadData(lead.data) as Record<string, unknown>
    csv += [
      lead.id,
      lead.createdAt.toISOString(),
      lead.sourceFormId,
      lead.status,
      typeof payload.email === 'string' ? payload.email : '',
      JSON.stringify(payload),
    ].map(escapeCsv).join(',') + '\n'
  }

  const headers = new Headers({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="leads_export_${new Date().toISOString().split('T')[0]}.csv"`,
  })
  return new NextResponse(csv, { status: 200, headers })
}

function escapeCsv(value: string): string {
  return `"${String(value).replace(/"/g, '""')}"`
}
