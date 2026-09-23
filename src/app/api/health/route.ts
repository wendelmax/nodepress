import prisma from '@/lib/prisma'
import { getRegisteredPlugins } from '@/plugins/registry'
import { resolvePluginOrder } from '@/plugins/dependencies'
import { HealthService } from '@/health'

const healthService = new HealthService([
  {
    name: 'database',
    async run() {
      await prisma.$queryRaw`SELECT 1`
      return { status: 'healthy' as const }
    },
  },
  {
    name: 'migrations',
    async run() {
      const applied = await prisma.pluginMigration.count()
      return { status: 'healthy' as const, details: { applied } }
    },
  },
  {
    name: 'plugins',
    async run() {
      const plugins = await getRegisteredPlugins()
      resolvePluginOrder(plugins)
      return { status: 'healthy' as const, details: { registered: plugins.length } }
    },
  },
  {
    name: 'storage',
    async run() {
      const driver = process.env.STORAGE_DRIVER || 'local'
      return { status: driver === 'local' ? 'degraded' as const : 'healthy' as const, details: { driver } }
    },
  },
  {
    name: 'queue',
    async run() {
      return { status: 'degraded' as const, details: { driver: 'in-process' } }
    },
  },
])

export async function GET() {
  const report = await healthService.check()
  return Response.json(report, { status: report.status === 'unhealthy' ? 503 : 200 })
}
