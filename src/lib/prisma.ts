import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prismaProxy = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (!globalThis.prismaGlobal) {
      globalThis.prismaGlobal = prismaClientSingleton()
    }
    const client = globalThis.prismaGlobal as any
    const value = client[prop]
    return typeof value === 'function' ? value.bind(client) : value
  }
})

export function reconnectPrisma() {
  if (globalThis.prismaGlobal) {
    globalThis.prismaGlobal.$disconnect()
  }
  globalThis.prismaGlobal = prismaClientSingleton()
  return globalThis.prismaGlobal
}

export default prismaProxy

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = globalThis.prismaGlobal ?? prismaClientSingleton()
