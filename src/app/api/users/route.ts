import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getSiteUrl } from '@/lib/site-url'
import { UserService } from '@/services/user.service'

// GET /np-json/np/v2/users
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const per_page = parseInt(searchParams.get('per_page') || '10')
  const page = parseInt(searchParams.get('page') || '1')
  
  const users = await prisma.user.findMany({
    take: per_page,
    skip: (page - 1) * per_page,
    orderBy: {
      userRegistered: 'desc',
    },
    select: {
      id: true,
      userLogin: true,
      displayName: true,
      userUrl: true,
      userRegistered: true,
      // We don't select userPass or userEmail for public/standard REST API responses by default
    }
  })

  // Format response
  const siteUrl = await getSiteUrl(request)
  const formattedUsers = users.map(user => ({
    id: user.id,
    name: user.displayName || user.userLogin,
    url: user.userUrl,
    description: '',
    link: `${siteUrl}/author/${user.userLogin}`,
    slug: user.userLogin,
    avatar_urls: {
      "24": `https://secure.gravatar.com/avatar/?s=24&d=mm&r=g`,
      "48": `https://secure.gravatar.com/avatar/?s=48&d=mm&r=g`,
      "96": `https://secure.gravatar.com/avatar/?s=96&d=mm&r=g`
    },
    meta: [],
  }))

  return NextResponse.json(formattedUsers)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse('Unauthorized', { status: 401 })
  
  try {
    const body = await request.json()
    const { userLogin, email, password, displayName, role } = body
    
    if (!userLogin || !email || !password) {
      return NextResponse.json({ error: 'Nome de usuário, e-mail e senha são obrigatórios.' }, { status: 400 })
    }
    
    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { userLogin },
          { userEmail: email }
        ]
      }
    })
    
    if (existing) {
      return NextResponse.json({ error: 'Usuário ou e-mail já existe.' }, { status: 400 })
    }
    
    const user = await UserService.create({
      userLogin,
      email,
      password,
      displayName,
      role: role || 'subscriber'
    })
    
    return NextResponse.json({ success: true, id: user.id })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

