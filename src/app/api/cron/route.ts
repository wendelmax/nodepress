import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { PostService } from '@/services/post.service'
import { OptionService } from '@/services/option.service'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const secretFromUrl = url.searchParams.get('secret')
    const authHeader = request.headers.get('authorization')

    // 1. Get Secret from Env or Database
    let configuredSecret = process.env.CRON_SECRET
    if (!configuredSecret) {
      const options = await OptionService.getOptions(['cron_secret'])
      configuredSecret = options['cron_secret']
    }

    if (!configuredSecret) {
      return NextResponse.json({ error: 'Cron secret not configured in server' }, { status: 500 })
    }

    // 2. Validate Authentication
    const isUrlAuth = secretFromUrl === configuredSecret
    const isHeaderAuth = authHeader === `Bearer ${configuredSecret}`

    if (!isUrlAuth && !isHeaderAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. Execute Background Task
    const publishedCount = await PostService.publishScheduledPosts()

    // 4. Revalidate cache if something changed
    if (publishedCount > 0) {
      // @ts-ignore
      revalidateTag('posts')
    }

    return NextResponse.json({
      success: true,
      message: `Cron executed successfully. Published ${publishedCount} scheduled posts.`,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('CRON Error:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 })
  }
}
