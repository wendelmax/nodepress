import { NextResponse } from 'next/server'
import prisma, { reconnectPrisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { getOriginFromRequest } from '@/lib/site-url'
import { getAuthProviderAvailability } from '@/lib/auth-config.mjs'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    let userCount = 0;
    try {
      userCount = await prisma.user.count()
    } catch (countError: any) {
      if (countError.code === 'P2021') {
        // Tables are missing. Run db push!
        await execAsync('npx prisma db push --accept-data-loss')
        reconnectPrisma()
      } else {
        throw countError
      }
    }

    if (userCount > 0) {
      return NextResponse.json({ error: 'Already installed' }, { status: 400 })
    }

    const body = await request.json()
    const { siteTitle, username, email, password, lang } = body
    const authConfig = getAuthProviderAvailability(process.env)

    if (!siteTitle || !username || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (authConfig.local && (!password || String(password).length < 8)) {
      return NextResponse.json({ error: 'A senha local deve ter pelo menos 8 caracteres.' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(
      authConfig.local ? String(password) : crypto.randomUUID(),
      10,
    )
    const siteLang = lang || 'en'
    const siteOrigin = getOriginFromRequest(request)

    // Use a transaction to ensure all steps succeed or all rollback
    await prisma.$transaction(async (tx) => {
      // Create the admin user
      const admin = await tx.user.create({
        data: {
          userLogin: username,
          userPass: passwordHash,
          userNicename: username.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          userEmail: email,
          userUrl: '',
          userActivationKey: '',
          displayName: username,
          meta: {
            create: {
              metaKey: 'capabilities',
              metaValue: JSON.stringify({ admin: true }),
            },
          },
        },
      })

      // Create default 'Hello World' post
      await tx.post.create({
        data: {
          postAuthor: admin.id,
          postContent: 'Welcome to NodePress. This is your first post. Edit or delete it, then start writing!',
          postTitle: 'Hello world!',
          postExcerpt: '',
          postPassword: '',
          postName: 'hello-world',
          toPing: '',
          pinged: '',
          postContentFiltered: '',
          guid: `${siteOrigin}/?p=1`,
          postMimeType: '',
        },
      })

      // Save site options
      await tx.option.createMany({
        data: [
          { optionName: 'siteurl', optionValue: siteOrigin },
          { optionName: 'blogname', optionValue: siteTitle },
          { optionName: 'admin_email', optionValue: email },
          { optionName: 'site_language', optionValue: siteLang },
          { optionName: 'blogdescription', optionValue: '' },
          { optionName: 'permalink_structure', optionValue: '/%postname%/' },
        ]
      })
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: any) {
    console.error('Installation error:', error)
    return NextResponse.json({ error: error?.message || 'Installation failed' }, { status: 500 })
  }
}
