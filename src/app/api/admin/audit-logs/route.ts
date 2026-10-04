import { requireAdmin } from '@/app/api/admin/plugins/_shared'
import type { AuditQuery } from '@/audit/types'

const MAX_PAGE_SIZE = 100

function parseInteger(value: string | null, name: string, fallback?: number): number | undefined {
  if (value === null || value === '') return fallback
  if (!/^\d+$/.test(value)) throw new Error(`Invalid ${name}`)
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`Invalid ${name}`)
  return parsed
}

function parseDate(value: string | null, name: string): Date | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid ${name}`)
  return parsed
}

function parseQuery(request: Request): { query: AuditQuery; format: 'json' | 'csv' } {
  const params = new URL(request.url).searchParams
  const formatValue = params.get('format') || 'json'
  if (formatValue !== 'json' && formatValue !== 'csv') throw new Error('Invalid format')

  const pageSize = parseInteger(params.get('pageSize'), 'pageSize', 25)
  if (pageSize && pageSize > MAX_PAGE_SIZE) throw new Error('Invalid pageSize')

  const success = params.get('success')
  if (success !== null && success !== 'true' && success !== 'false') throw new Error('Invalid success')

  const actorUserId = parseInteger(params.get('actorUserId'), 'actorUserId')
  return {
    format: formatValue,
    query: {
      page: parseInteger(params.get('page'), 'page', 1),
      pageSize,
      action: params.get('action') || undefined,
      resourceType: params.get('resourceType') || undefined,
      resourceId: params.get('resourceId') || undefined,
      actorUserId,
      success: success === null ? undefined : success === 'true',
      from: parseDate(params.get('from'), 'from'),
      to: parseDate(params.get('to'), 'to'),
    },
  }
}

export async function GET(request: Request) {
  const access = await requireAdmin()
  if ('response' in access) return access.response

  try {
    const { query, format } = parseQuery(request)
    if (format === 'csv') {
      const result = await access.auditLogService.export(query, format)
      return new Response(result.body, {
        headers: {
          'content-type': result.contentType,
          'content-disposition': `attachment; filename="${result.filename}"`,
        },
      })
    }
    return Response.json(await access.auditLogService.list(query))
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Invalid audit log query' }, { status: 400 })
  }
}
