import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import { UserService } from '@/services/user.service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_read', message: 'Sorry, you are not allowed to read users.', data: { status: 401 } }, { status: 401 })
  }

  const { id: paramId } = await params
  const id = parseInt(paramId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const user = await UserService.getById(id)
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_edit', message: 'Sorry, you are not allowed to edit this user.', data: { status: 401 } }, { status: 401 })
  }

  const { id: paramId } = await params
  const id = parseInt(paramId)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  try {
    const body = await request.json()
    const { email, displayName, url, newPassword, role } = body

    const user = await UserService.update(id, { email, displayName, url, newPassword, role })

    return NextResponse.json(user)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ code: 'internal_error', message: 'Error updating user' }, { status: 500 })
  }
}
