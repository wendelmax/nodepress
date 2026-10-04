import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const keys = Object.keys(prisma)
  const hasCanonicalFormSubmission = !!(prisma as any).formEngineSubmission
  return NextResponse.json({ 
    keys, 
    hasCanonicalFormSubmission,
    formEngineSubmissionType: typeof (prisma as any).formEngineSubmission
  })
}
