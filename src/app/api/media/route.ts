import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { MediaService } from '@/services/media.service'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_read', message: 'Sorry, you are not allowed to read media.', data: { status: 401 } }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10) || 1
    const result = await MediaService.getAll(page)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ code: 'internal_error', message: 'Error fetching media' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_create', message: 'Sorry, you are not allowed to upload media.', data: { status: 401 } }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ code: 'rest_upload_no_data', message: 'No file was uploaded.', data: { status: 400 } }, { status: 400 })
    }

    const attachment = await MediaService.upload(file, parseInt((session.user as any).id))

    const responseFormat = {
      ...attachment,
      success: 1,
      file: {
        url: attachment.guid
      }
    }

    return NextResponse.json(responseFormat, { status: 201 })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ code: 'internal_error', message: 'Error uploading media' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_delete', message: 'Sorry, you are not allowed to delete media.', data: { status: 401 } }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const idStr = searchParams.get('id')
    if (!idStr) {
      return NextResponse.json({ code: 'missing_id', message: 'Missing media ID.' }, { status: 400 })
    }
    const id = parseInt(idStr)
    await MediaService.delete(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete error:", error)
    return NextResponse.json({ code: 'internal_error', message: 'Error deleting media' }, { status: 500 })
  }
}

