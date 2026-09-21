import type { NodePressContext } from '@/core/context'
import type { CachePort, MailPort, ObjectStoragePort, PortHealth, QueuePort, SearchPort, WebhookPort } from '@/core/ports'
import { InMemoryCachePort, InMemoryObjectStoragePort, InProcessQueuePort } from './in-memory-adapters'
import { LocalFileObjectStoragePort } from './local-storage'

export interface NodePressInfrastructure {
  cache: CachePort
  storage: ObjectStoragePort
  queue: QueuePort
  search: SearchPort
  mail: MailPort
  webhooks: WebhookPort
}

export interface NodePressInfrastructureOptions {
  env?: NodeJS.ProcessEnv
  storageRoot?: string
}

/**
 * Creates safe defaults for a single-process deployment. External adapters can
 * replace each port without changing application services.
 */
export function createDefaultInfrastructure(options: NodePressInfrastructureOptions = {}): NodePressInfrastructure {
  const env = options.env ?? process.env
  const storage = env.STORAGE_DRIVER === 'local-filesystem'
    ? new LocalFileObjectStoragePort(options.storageRoot ?? env.STORAGE_LOCAL_ROOT ?? './data/uploads')
    : new InMemoryObjectStoragePort()

  return {
    cache: new InMemoryCachePort(),
    storage,
    queue: new InProcessQueuePort(),
    search: new NoopSearchPort(),
    mail: new NoopMailPort(),
    webhooks: new NoopWebhookPort(),
  }
}

export class NoopSearchPort implements SearchPort {
  readonly id = 'search.noop'
  readonly capabilities = ['index', 'search'] as const

  async index(_index: string, _id: string, _document: Record<string, unknown>): Promise<void> {}
  async search<T>(_index: string, _query: string): Promise<T[]> { return [] }
  async health(_context: NodePressContext): Promise<PortHealth> {
    return { status: 'degraded', details: { reason: 'search adapter is not configured' } }
  }
}

export class NoopMailPort implements MailPort {
  readonly id = 'mail.noop'
  readonly capabilities = ['send'] as const

  async send(_message: { to: string; subject: string; text: string; html?: string }): Promise<void> {}
  async health(_context: NodePressContext): Promise<PortHealth> {
    return { status: 'degraded', details: { reason: 'mail adapter is not configured' } }
  }
}

export class NoopWebhookPort implements WebhookPort {
  readonly id = 'webhook.noop'
  readonly capabilities = ['dispatch'] as const

  async dispatch(_url: string, _event: Record<string, unknown>): Promise<void> {}
  async health(_context: NodePressContext): Promise<PortHealth> {
    return { status: 'degraded', details: { reason: 'webhook adapter is not configured' } }
  }
}
