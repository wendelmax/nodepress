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

    // 1. Import Options (bulk)
    if (options.length > 0) {
      const optionNames = options
        .map((opt: any) => opt.optionName)
        .filter((name: string) => typeof name === 'string' && name.length > 0)

      const existingOptions = await prisma.option.findMany({
        where: { optionName: { in: optionNames } },
        select: { optionName: true }
      })
      const existingOptionSet = new Set(existingOptions.map(o => o.optionName))

      const missingOptions = options
        .filter((opt: any) => !existingOptionSet.has(opt.optionName))
        .map((opt: any) => ({
          optionName: opt.optionName,
          optionValue: opt.optionValue ?? '',
          autoload: opt.autoload ?? 'yes'
        }))

      if (missingOptions.length > 0) {
        const created = await prisma.option.createMany({
          data: missingOptions,
          skipDuplicates: true
        })
        importedOptions = created.count
      }
    }

    // 2. Import Posts + Meta (bulk)
    if (posts.length > 0) {
      const postIds = posts
        .map((p: any) => Number(p.id))
        .filter((id: number) => Number.isInteger(id) && id > 0)

      const existingPosts = await prisma.post.findMany({
        where: { id: { in: postIds } },
        select: { id: true }
      })
      const existingPostSet = new Set(existingPosts.map(p => p.id))

      const missingPostsRaw = posts.filter((p: any) => !existingPostSet.has(Number(p.id)))

      const postData = missingPostsRaw.map((p: any) => {
        const { meta, author, comments, ...baseData } = p
        return baseData
      })

      if (postData.length > 0) {
        const createdPosts = await prisma.post.createMany({
          data: postData,
          skipDuplicates: true
        })
        importedPosts = createdPosts.count
      }

      const postMetaData = missingPostsRaw.flatMap((p: any) => {
        const postId = Number(p.id)
        const meta = Array.isArray(p.meta) ? p.meta : []
        return meta
          .filter((m: any) => typeof m.metaKey === 'string')
          .map((m: any) => ({
            postId,
            metaKey: m.metaKey,
            metaValue: m.metaValue ?? ''
          }))
      })

      if (postMetaData.length > 0) {
        await prisma.postMeta.createMany({
          data: postMetaData,
          skipDuplicates: true
        })
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
