import { NextResponse } from 'next/server'
import { auth } from "@/auth"
import { OptionService } from '@/services/option.service'

export async function GET(request: Request) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_view', message: 'Sorry, you are not allowed to view settings.', data: { status: 401 } }, { status: 401 })
  }

  try {
    const settingsMap = await OptionService.getOptions()

    // Ensure defaults if not found
    const result = {
      blogname: settingsMap['blogname'] || '',
      blogdescription: settingsMap['blogdescription'] || '',
      siteurl: settingsMap['siteurl'] || '',
      admin_email: settingsMap['admin_email'] || '',
      site_language: settingsMap['site_language'] || 'en'
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ code: 'internal_error', message: 'Error fetching settings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ code: 'rest_cannot_edit', message: 'Sorry, you are not allowed to edit settings.', data: { status: 401 } }, { status: 401 })
  }

  try {
    const body = await request.json()
    
    await OptionService.saveOptions(body)
    
    const settingsMap = await OptionService.getOptions()
    return NextResponse.json(settingsMap)

  } catch (error) {
    return NextResponse.json({ code: 'internal_error', message: 'Error updating settings' }, { status: 500 })
  }
}
