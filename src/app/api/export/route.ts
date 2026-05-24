import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch all essential data
    const posts = await prisma.post.findMany({
      include: { meta: true }
    })
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        userLogin: true,
        userEmail: true,
        displayName: true,
        userRegistered: true,
        meta: true
      }
    })

    const taxonomies = await prisma.term.findMany({
      include: { taxonomies: true }
    })

    const options = await prisma.option.findMany()

    // 2. Build the export payload
    const exportData = {
      version: "1.0.0",
      generated_at: new Date().toISOString(),
      site_url: process.env.NEXT_PUBLIC_SITE_URL || '',
      data: {
        posts,
        users,
        taxonomies,
        options
      }
    }

    // 3. Return as downloadable JSON file
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="nodepress-export-${new Date().toISOString().slice(0,10)}.json"`
      }
    })
  } catch (error) {
    console.error("Export Error:", error)
    return NextResponse.json({ error: 'Failed to generate export file.' }, { status: 500 })
  }
}
