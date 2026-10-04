import { OptionService } from '@/services/option.service'
import type { NodePressPlugin } from '../types'
import { normalizeConsentConfig, DEFAULT_CONSENT_CONFIG } from './consent-service'
import { createConsentMigration } from './migration'
import { createConsentRepository } from './repository'
import { createConsentRoutes } from './routes'

const CONFIG_KEYS = ['lgpd_policy_version', 'lgpd_policy_url', 'lgpd_retention_days']

async function getConfig() {
  const options = await OptionService.getOptions(CONFIG_KEYS)
  return normalizeConsentConfig({
    policyVersion: options.lgpd_policy_version || DEFAULT_CONSENT_CONFIG.policyVersion,
    policyUrl: options.lgpd_policy_url || DEFAULT_CONSENT_CONFIG.policyUrl,
    retentionDays: options.lgpd_retention_days ? Number(options.lgpd_retention_days) : DEFAULT_CONSENT_CONFIG.retentionDays,
  })
}

export const lgpdConsentPlugin: NodePressPlugin = {
  id: 'lgpd-consent',
  name: 'Consentimento LGPD',
  version: '1.0.0',
  permissions: ['privacy.manage'],
  migrations: [createConsentMigration],
  register({ menus, routes, commands }) {
    const repository = createConsentRepository()
    const dependencies = {
      getConfig,
      async saveConfig(config: Awaited<ReturnType<typeof getConfig>>) {
        await OptionService.saveOptions({
          lgpd_policy_version: config.policyVersion,
          lgpd_policy_url: config.policyUrl,
          lgpd_retention_days: String(config.retentionDays),
        })
      },
      append: repository.append,
      prune: repository.prune,
      async isAdmin() {
        const { auth } = await import('@/auth')
        const session = await auth()
        return (session?.user as { role?: string } | undefined)?.role === 'admin'
      },
    }

    for (const route of createConsentRoutes(dependencies)) routes.add(route)
    commands.add({
      id: 'lgpd-consent.cleanup',
      async handler() {
        const config = await getConfig()
        await repository.prune(new Date(Date.now() - config.retentionDays * 24 * 60 * 60 * 1000))
      },
    })
    menus.addAdmin({
      id: 'lgpd-consent',
      label: 'Consentimento LGPD',
      href: '/admin/plugins/lgpd-consent',
      icon: 'Settings',
      capability: 'privacy.manage',
      position: 90,
    })
  },
}

export default lgpdConsentPlugin
