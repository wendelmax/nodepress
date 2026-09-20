import { requireAdmin } from './_shared'

export async function GET() {
  const result = await requireAdmin()
  if ('response' in result) return result.response
  return Response.json({ plugins: await result.service.list() })
}
