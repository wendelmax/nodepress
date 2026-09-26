import { randomBytes } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'

function readSecret(content) {
  const match = content.match(/^(?:AUTH_SECRET|NEXTAUTH_SECRET)=(?:"([^"]+)"|'([^']+)'|([^\r\n]+))/m)
  return match?.[1] || match?.[2] || match?.[3]?.trim() || null
}

export async function ensureRuntimeConfig({ configDirectory = process.env.NODEPRESS_CONFIG_DIR || '/var/lib/nodepress' } = {}) {
  await mkdir(configDirectory, { recursive: true })
  const envPath = path.join(configDirectory, '.env')

  let content = ''
  try {
    content = await readFile(envPath, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }

  const existingSecret = readSecret(content) || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (existingSecret) {
    return { envPath, secret: existingSecret, createdSecret: false }
  }

  const secret = randomBytes(32).toString('hex')
  const prefix = content && !content.endsWith('\n') ? `${content}\n` : content
  const nextContent = `${prefix}NEXTAUTH_SECRET="${secret}"\n`
  const temporaryPath = `${envPath}.${process.pid}.tmp`
  await writeFile(temporaryPath, nextContent, { encoding: 'utf8', mode: 0o600 })
  await rename(temporaryPath, envPath)

  return { envPath, secret, createdSecret: true }
}
