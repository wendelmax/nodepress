import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { S3Driver } from '@/storage/S3Driver'
import { LocalDriver } from '@/storage/LocalDriver'
import { StorageDriverFactory } from '@/storage/StorageDriverFactory'

/**
 * POST /api/storage/test-connection
 *
 * Validates storage credentials by performing a minimal test upload and delete.
 * Used by the admin settings page before persisting credentials to the database.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user) {
    return NextResponse.json(
      { success: false, message: 'Não autorizado.' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { driver, s3_access_key, s3_secret_key, s3_bucket, s3_region, s3_endpoint, s3_public_url } = body

    if (driver === 'local') {
      // Local driver: just instantiate it (creates directory) and confirm
      new LocalDriver()
      return NextResponse.json({ success: true, message: 'Armazenamento local configurado e pronto.' })
    }

    if (driver === 's3') {
      if (!s3_access_key || !s3_secret_key || !s3_bucket || !s3_region) {
        return NextResponse.json(
          { success: false, message: 'Preencha todos os campos obrigatórios: Access Key, Secret Key, Bucket e Região.' },
          { status: 400 }
        )
      }

      const testDriver = new S3Driver({
        accessKeyId: s3_access_key,
        secretAccessKey: s3_secret_key,
        bucket: s3_bucket,
        region: s3_region,
        endpoint: s3_endpoint || undefined,
        publicUrl: s3_public_url || undefined,
      })

      // Upload a tiny test file then delete it immediately
      const testKey = `.nodepress-test-${Date.now()}.txt`
      const testBuffer = Buffer.from('NodePress storage connection test')
      const url = await testDriver.upload(testBuffer, testKey, 'text/plain')
      await testDriver.delete(url)

      return NextResponse.json({
        success: true,
        message: `Conexão com o bucket "${s3_bucket}" estabelecida com sucesso!`,
      })
    }

    return NextResponse.json(
      { success: false, message: 'Driver de armazenamento inválido.' },
      { status: 400 }
    )
  } catch (error: any) {
    const msg = error?.message || 'Erro desconhecido ao testar a conexão.'
    return NextResponse.json(
      { success: false, message: `Falha na conexão: ${msg}` },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS /api/storage/test-connection
 *
 * Called by the admin UI after saving new storage settings to invalidate
 * the in-process StorageDriverFactory cache so the next request uses the
 * updated configuration without requiring a server restart.
 */
export async function OPTIONS() {
  StorageDriverFactory.invalidate()
  return new Response(null, { status: 204 })
}

