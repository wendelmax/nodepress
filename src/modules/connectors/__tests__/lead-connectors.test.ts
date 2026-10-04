import { describe, expect, it } from 'vitest'
import { HubSpotLeadConnector, MailchimpLeadConnector, SlackLeadConnector } from '../lead-connectors'

describe('lead connectors', () => {
  it('maps a lead to the HubSpot contact endpoint', async () => {
    const requests: unknown[] = []
    const connector = new HubSpotLeadConnector({
      async request(request) {
        requests.push(request)
        return { status: 201 }
      },
    })

    await connector.sendLead({ id: 'lead-1', data: { email: 'ada@example.test', name: 'Ada' } })

    expect(requests[0]).toEqual(expect.objectContaining({
      method: 'POST',
      path: '/crm/v3/objects/contacts',
      body: { properties: { email: 'ada@example.test', name: 'Ada' } },
    }))
  })

  it('maps a lead to Mailchimp and Slack without embedding credentials', async () => {
    const requests: Array<{ path: string; body: unknown }> = []
    const request = async (input: { method: 'POST'; path: string; body: Record<string, unknown> }) => {
      requests.push(input)
      return { status: 200 }
    }

    await new MailchimpLeadConnector({ request }).sendLead({ id: 'lead-1', data: { email: 'ada@example.test' } })
    await new SlackLeadConnector({ request }).sendLead({ id: 'lead-1', data: { email: 'ada@example.test' } })

    expect(requests).toEqual([
      { method: 'POST', path: '/lists/subscribe', body: { email_address: 'ada@example.test', status: 'subscribed' } },
      { method: 'POST', path: '/chat.postMessage', body: { text: 'New lead: ada@example.test' } },
    ])
    expect(JSON.stringify(requests)).not.toContain('token')
    expect(JSON.stringify(requests)).not.toContain('secret')
  })
})
