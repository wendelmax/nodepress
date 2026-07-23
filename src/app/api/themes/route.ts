import { NextResponse } from 'next/server'
import { auth } from "@/auth"


export async function GET() {
  const session = await auth()
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const themesMeta = [
    {
      name: "NodePress Default",
      description: "The official minimalist theme for NodePress. Fast, clean, and accessible.",
      author: "NodePress Team",
      version: "1.0.0",
      slug: "default"
    }
  ]
  return NextResponse.json(themesMeta)
}
