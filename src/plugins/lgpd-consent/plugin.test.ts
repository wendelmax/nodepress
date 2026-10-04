import { describe, expect, it, vi } from 'vitest'
import { registeredPlugins } from '../registry'
import { CONSENT_LEDGER_DDL, createConsentMigration } from './migration'
import { createConsentRoutes, type ConsentRouteDependencies } from './routes'
import { DEFAULT_CONSENT_CONFIG } from './consent-service'

function makeDependencies(overrides: Partial<ConsentRouteDependencies> = {}): ConsentRouteDependencies {
  return {
    getConfig: vi.fn(async () => ({ ...DEFAULT_CONSENT_CONFIG, policyVersion: 'server-v2' })),
    saveConfig: vi.fn(async () => undefined),
    append: vi.fn(async () => undefined),
    prune: vi.fn(async () => 0),
    isAdmin: vi.fn(async () => true),
    ...overrides,
  }
}

async function callRoute(dependencies: ConsentRouteDependencies, method: string, path: string, body?: unknown) {
  const route = createConsentRoutes(dependencies).find((candidate) => candidate.method === method && candidate.path === path)
  if (!route) throw new Error(`Route not found: ${method} ${path}`)
  return route.handler(new Request(`https://example.test${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }), {} as never)
}

describe('lgpd-consent plugin', () => {
  it('owns a migration with a minimized ledger and is present in the native registry', () => {
    expect(createConsentMigration.id).toBe('001-create-consent-ledger')
    expect(CONSENT_LEDGER_DDL).toContain('np_lgpd_consents')
    expect(CONSENT_LEDGER_DDL).toContain('policy_version')
    expect(CONSENT_LEDGER_DDL).not.toMatch(/ip|user_agent|path|visitor_id/i)
    expect(registeredPlugins.some((plugin) => plugin.id === 'lgpd-consent')).toBe(true)
  })

  it('serves only safe public configuration', async () => {
    const response = await callRoute(makeDependencies(), 'GET', '/lgpd-consent/config')
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      policyVersion: 'server-v2',
      policyUrl: '',
      retentionDays: 365,
    })
  })

  it('requires an administrator to update policy configuration', async () => {
    const dependencies = makeDependencies({ isAdmin: vi.fn(async () => false) })
    const response = await callRoute(dependencies, 'POST', '/lgpd-consent/config', {
      policyVersion: 'attacker-version',
      policyUrl: 'javascript:alert(1)',
      retentionDays: 1,
    })

    expect(response.status).toBe(403)
    expect(dependencies.saveConfig).not.toHaveBeenCalled()
  })

  it('records client choices using the server policy and prunes by configured retention', async () => {
    const dependencies = makeDependencies()
    const response = await callRoute(dependencies, 'POST', '/lgpd-consent/record', {
      policyVersion: 'attacker-version',
      choices: { necessary: true, analytics: true, preferences: false, marketing: false },
      locale: 'pt-BR',
      decision: 'save',
    })

    expect(response.status).toBe(201)
    expect(dependencies.append).toHaveBeenCalledWith(expect.objectContaining({
      policyVersion: 'server-v2',
      choices: { necessary: true, analytics: true, preferences: false, marketing: false },
    }))
    expect(dependencies.prune).toHaveBeenCalledOnce()
  })

  it('rejects a record without choices instead of manufacturing consent', async () => {
    const dependencies = makeDependencies()
    const response = await callRoute(dependencies, 'POST', '/lgpd-consent/record', {
      locale: 'pt-BR',
      decision: 'save',
    })

    expect(response.status).toBe(400)
    expect(dependencies.append).not.toHaveBeenCalled()
  })
})
