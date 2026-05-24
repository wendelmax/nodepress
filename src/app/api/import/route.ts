import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileContents = await file.text()
    const json = JSON.parse(fileContents)

    if (!json.version || !json.data) {
      return NextResponse.json({ error: 'Invalid NodePress export file format.' }, { status: 400 })
    }

    const { posts = [], users = [], taxonomies = [], options = [] } = json.data
    
    // We will do a simple/dumb import: we will try to insert posts that don't exist by ID
    // Note: In a real advanced importer, we would map old IDs to new IDs. For this MVP we just import everything and if ID exists, we skip.
    
    let importedPosts = 0
    let importedOptions = 0

    // 1. Import Options
    for (const opt of options) {
      const exists = await prisma.option.findUnique({ where: { optionName: opt.optionName } })
      if (!exists) {
        await prisma.option.create({
          data: {
            optionName: opt.optionName,
            optionValue: opt.optionValue,
            autoload: opt.autoload
          }
        })
        importedOptions++
      }
    }

    // 2. Import Posts
    for (const p of posts) {
      const exists = await prisma.post.findUnique({ where: { id: p.id } })
      if (!exists) {
        // We need to strip relational fields that we will insert manually or let Prisma ignore
        const { meta, author, comments, id, ...postData } = p
        
        await prisma.post.create({
          data: {
            id, // We force the ID to maintain references
            ...postData,
            meta: meta && meta.length > 0 ? {
              create: meta.map((m: any) => ({
                metaKey: m.metaKey,
                metaValue: m.metaValue
              }))
            } : undefined
          }
        })
        importedPosts++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Import completed. ${importedPosts} posts and ${importedOptions} options were imported.` 
    })

  } catch (error: any) {
    console.error("Import Error:", error)
    return NextResponse.json({ error: `Import failed: ${error.message}` }, { status: 500 })
  }
}
