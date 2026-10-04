import type { PluginRouteDefinition } from '../runtime-registries'
import { buildConsentEvent, normalizeConsentConfig, type ConsentConfig } from './consent-service'
import type { ConsentRepository } from './repository'

export interface ConsentRouteDependencies {
  getConfig(): Promise<ConsentConfig>
  saveConfig(config: ConsentConfig): Promise<void>
  append(event: ReturnType<typeof buildConsentEvent>): Promise<void>
  prune(before: Date): Promise<number>
  isAdmin(request: Request): Promise<boolean>
}

const json = (body: unknown, status = 200) => Response.json(body, { status })

function retentionCutoff(config: ConsentConfig, now = new Date()): Date {
  return new Date(now.getTime() - config.retentionDays * 24 * 60 * 60 * 1000)
}

export function createConsentRoutes(dependencies: ConsentRouteDependencies): PluginRouteDefinition[] {
  return [
    {
      id: 'lgpd-consent.config.read',
      method: 'GET',
      path: '/lgpd-consent/config',
      async handler() {
        return json(await dependencies.getConfig())
      },
    },
    {
      id: 'lgpd-consent.config.write',
      method: 'POST',
      path: '/lgpd-consent/config',
      async handler(request) {
        if (!(await dependencies.isAdmin(request))) return json({ error: 'Forbidden' }, 403)
        try {
          const config = normalizeConsentConfig(await request.json())
          await dependencies.saveConfig(config)
          return json(config)
        } catch {
          return json({ error: 'Invalid consent configuration' }, 400)
        }
      },
    },
    {
      id: 'lgpd-consent.record',
      method: 'POST',
      path: '/lgpd-consent/record',
      async handler(request) {
        try {
          const body = await request.json() as { choices?: unknown; locale?: unknown; decision?: unknown; policyVersion?: unknown }
          if (!Object.prototype.hasOwnProperty.call(body, 'choices')) {
            return json({ error: 'Consent choices are required' }, 400)
          }
          const config = await dependencies.getConfig()
          const event = buildConsentEvent({
            choices: body.choices,
            locale: body.locale,
            decision: body.decision,
            policyVersion: body.policyVersion,
          }, config)
          await dependencies.append(event)
          await dependencies.prune(retentionCutoff(config))
          return json({ ok: true, policyVersion: config.policyVersion }, 201)
        } catch {
          return json({ error: 'Unable to record consent' }, 400)
        }
      },
    },
    {
      id: 'lgpd-consent.cleanup',
      method: 'POST',
      path: '/lgpd-consent/cleanup',
      async handler(request) {
        if (!(await dependencies.isAdmin(request))) return json({ error: 'Forbidden' }, 403)
        const config = await dependencies.getConfig()
        const deleted = await dependencies.prune(retentionCutoff(config))
        return json({ ok: true, deleted })
      },
    },
  ]
}
