import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getServiceToken, admissionsBaseUrl, tenantId } from '@/lib/admissions-service-token'

export async function GET() {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const token = await getServiceToken()
    const res = await fetch(`${admissionsBaseUrl()}/api/admissions/processes`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tenant-ID': tenantId(),
      },
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `admissions service: ${res.status} ${text}` }, { status: 502 })
    }

    const processes = await res.json()
    return NextResponse.json(processes)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch processes' }, { status: 500 })
  }
}
