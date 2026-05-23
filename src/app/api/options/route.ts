import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { OptionService } from '@/services/option.service'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const keysParam = searchParams.get('keys')
  const keys = keysParam ? keysParam.split(',') : undefined

  const options = await OptionService.getOptions(keys)
  return NextResponse.json(options)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    await OptionService.saveOptions(body)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
