import { revalidatePath, revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'
import { auth } from "@/auth"

export async function POST(request: Request) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')
  const tag = searchParams.get('tag')

  if (path) {
    revalidatePath(path, 'layout')
    return NextResponse.json({ revalidated: true, path })
  }

  if (tag) {
    // @ts-ignore
    revalidateTag(tag)
    return NextResponse.json({ revalidated: true, tag })
  }

  return NextResponse.json({ revalidated: false, message: 'Missing path or tag' })
}
