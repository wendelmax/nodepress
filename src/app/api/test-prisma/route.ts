import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const keys = Object.keys(prisma)
  const hasFormSubmission = !!(prisma as any).formSubmission
  return NextResponse.json({ 
    keys, 
    hasFormSubmission,
    formSubmissionType: typeof (prisma as any).formSubmission
  })
}
