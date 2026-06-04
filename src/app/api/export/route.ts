import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

const BATCH_SIZE = 500

export async function GET() {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Fetch essential data in batches
    const posts: any[] = []
    let lastPostId = 0
    while (true) {
      const batch = await prisma.post.findMany({
        where: { id: { gt: lastPostId } },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        include: { meta: true }
      })
      if (batch.length === 0) break
      posts.push(...batch)
      lastPostId = batch[batch.length - 1].id
    }

    const users: any[] = []
    let lastUserId = 0
    while (true) {
      const batch = await prisma.user.findMany({
        where: { id: { gt: lastUserId } },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        select: {
          id: true,
          userLogin: true,
          userEmail: true,
          displayName: true,
          userRegistered: true,
          meta: true
        }
      })
      if (batch.length === 0) break
      users.push(...batch)
      lastUserId = batch[batch.length - 1].id
    }

    const taxonomies: any[] = []
    let lastTermId = 0
    while (true) {
      const batch = await prisma.term.findMany({
        where: { termId: { gt: lastTermId } },
        orderBy: { termId: 'asc' },
        take: BATCH_SIZE,
        include: { taxonomies: true }
      })
      if (batch.length === 0) break
      taxonomies.push(...batch)
      lastTermId = batch[batch.length - 1].termId
    }

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
