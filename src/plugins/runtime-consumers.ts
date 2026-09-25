import type { NodePressContext } from '@/core/context'
import {
  commandRegistry,
  jobRegistry,
  routeRegistry,
} from './runtime-registries'
import type { PluginRouteDefinition } from './runtime-registries'

const DEFAULT_ROUTE_PREFIX = '/api/plugins'

export async function dispatchPluginRoute(
  request: Request,
  context: NodePressContext,
  prefix = DEFAULT_ROUTE_PREFIX,
): Promise<Response | undefined> {
  const pathname = new URL(request.url).pathname
  const normalizedPrefix = prefix === '/' ? '' : prefix.replace(/\/+$/, '')
  if (normalizedPrefix && pathname !== normalizedPrefix && !pathname.startsWith(`${normalizedPrefix}/`)) {
    return undefined
  }

  const routePath = normalizedPrefix ? pathname.slice(normalizedPrefix.length) || '/' : pathname
  const method = request.method as PluginRouteDefinition['method']
  const route = routeRegistry.find(method, routePath)
  return route ? route.handler(request, context) : undefined
}

export async function runPluginJob(
  jobId: string,
  payload: unknown,
  context: NodePressContext,
): Promise<void> {
  const job = jobRegistry.get(jobId)
  if (!job) throw new Error(`Unknown plugin job: ${jobId}`)
  await job.handler(payload, context)
}

export async function executePluginCommand(
  commandId: string,
  args: Record<string, unknown>,
  context: NodePressContext,
): Promise<void> {
  const command = commandRegistry.get(commandId)
  if (!command) throw new Error(`Unknown plugin command: ${commandId}`)
  await command.handler(args, context)
}
