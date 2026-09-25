import { NextResponse } from 'next/server'
import { contentTypeRegistry } from '@/modules/content'
import { ensureActivePluginsLoaded } from '@/services/plugin-factory'

const coreTypes = [
  { id: 'post', label: 'Posts' },
  { id: 'page', label: 'Pages' },
]

export async function GET(request: Request) {
  try {
    await ensureActivePluginsLoaded()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim().toLocaleLowerCase() ?? ''
    const byId = new Map(coreTypes.map((type) => [type.id, type]))

    for (const definition of contentTypeRegistry.list()) {
      if (!byId.has(definition.id)) {
        byId.set(definition.id, { id: definition.id, label: definition.label })
      }
    }

    const types = [...byId.values()]
      .filter((type) => !search || `${type.id} ${type.label}`.toLocaleLowerCase().includes(search))
      .sort((left, right) => left.label.localeCompare(right.label))

    return NextResponse.json({ types })
  } catch {
    return NextResponse.json(
      { code: 'internal_error', message: 'Error fetching content types' },
      { status: 500 },
    )
  }
}
