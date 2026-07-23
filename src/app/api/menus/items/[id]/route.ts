import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import { MenuService } from '@/services/menu.service'

// DELETE /api/menus/items/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const itemId = parseInt(id)
    if (isNaN(itemId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    await MenuService.deleteMenuItem(itemId)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
