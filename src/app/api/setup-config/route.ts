import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { dbName, username, password, host, port } = body

    if (!dbName || !username || !password || !host || !port) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    // Construct Postgres URL
    // Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
    const encodedPassword = encodeURIComponent(password)
    const databaseUrl = `postgresql://${username}:${encodedPassword}@${host}:${port}/${dbName}`

    // Write to .env file
    const envPath = path.join(process.cwd(), '.env')
    let envContent = ''
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8')
    }

    // Update or append DATABASE_URL
    if (envContent.includes('DATABASE_URL=')) {
      envContent = envContent.replace(/DATABASE_URL=.*/g, `DATABASE_URL="${databaseUrl}"`)
    } else {
      envContent += `\nDATABASE_URL="${databaseUrl}"`
    }
    
    // Auto-generate NEXTAUTH_SECRET if not exists
    if (!envContent.includes('NEXTAUTH_SECRET=')) {
      const secret = crypto.randomBytes(32).toString('hex')
      envContent += `\nNEXTAUTH_SECRET="${secret}"`
    }

    // Auto-set NEXTAUTH_URL if not exists based on the request origin
    if (!envContent.includes('NEXTAUTH_URL=')) {
      // In dev this is typically localhost:3000, but let's grab it from headers if possible
      const hostHeader = request.headers.get('host') || 'localhost:3000'
      const protocol = request.headers.get('x-forwarded-proto') || (hostHeader.includes('localhost') ? 'http' : 'https')
      envContent += `\nNEXTAUTH_URL="${protocol}://${hostHeader}"`
    }
    
    fs.writeFileSync(envPath, envContent)

    // Overwrite the process variable for the current runtime
    process.env.DATABASE_URL = databaseUrl

    // Run Prisma DB Push
    // We use --accept-data-loss just in case, though for initial setup it's fine.
    try {
      await execAsync('npx prisma db push --accept-data-loss')
      
      // Reconnect Prisma Client with the new database URL
      const { reconnectPrisma } = await import('@/lib/prisma')
      reconnectPrisma()

    } catch (pushError: any) {
      console.error('Prisma push error:', pushError)
      return NextResponse.json({ 
        error: 'Failed to create database tables. Please check if your credentials are correct and the database exists.', 
        details: pushError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error('Setup config error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred.', details: error.message }, { status: 500 })
  }
}
