import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await auth()
  
  // Check authorization
  if (!session || !session.user || (session.user as any).role !== 'administrator') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const formId = searchParams.get('formId')
  const status = searchParams.get('status')

  const where: any = {}
  if (formId) where.formId = formId
  if (status) where.status = status

  const submissions = await prisma.formSubmission.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  })

  // Prepare CSV
  let csv = 'ID,Date,FormId,Status,Email,Payload\n'
  
  for (const sub of submissions) {
    let payload = {}
    let email = ''
    try {
      payload = JSON.parse(sub.payload)
      email = (payload as any).email || ''
    } catch (e) {}

    const date = new Date(sub.createdAt).toISOString()
    const safePayload = JSON.stringify(payload).replace(/"/g, '""')
    
    csv += `${sub.id},"${date}","${sub.formId}","${sub.status}","${email}","${safePayload}"\n`
  }

  const headers = new Headers()
  headers.set('Content-Type', 'text/csv')
  headers.set('Content-Disposition', `attachment; filename="leads_export_${new Date().toISOString().split('T')[0]}.csv"`)

  return new NextResponse(csv, { status: 200, headers })
}
