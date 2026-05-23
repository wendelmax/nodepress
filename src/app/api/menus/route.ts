import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { MenuService } from '@/services/menu.service'

export async function GET() {
  try {
    const menus = await MenuService.getMenus()
    return NextResponse.json(menus)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch menus' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const menu = await MenuService.createMenu(body.name)
    return NextResponse.json(menu, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create menu' }, { status: 500 })
  }
}
