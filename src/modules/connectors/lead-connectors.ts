export interface ConnectorRequest {
  method: 'POST'
  path: string
  body: Record<string, unknown>
}

export interface ConnectorResponse {
  status: number
}

export interface ConnectorTransport {
  request(request: ConnectorRequest): Promise<ConnectorResponse>
}

export interface ConnectorLead {
  id: string
  data: Record<string, unknown>
}

export interface LeadConnector {
  sendLead(lead: ConnectorLead): Promise<void>
}

export class HubSpotLeadConnector implements LeadConnector {
  constructor(private readonly transport: ConnectorTransport) {}

  async sendLead(lead: ConnectorLead): Promise<void> {
    await ensureSuccess(await this.transport.request({
      method: 'POST',
      path: '/crm/v3/objects/contacts',
      body: { properties: withoutSecrets(lead.data) },
    }))
  }
}

export class MailchimpLeadConnector implements LeadConnector {
  constructor(private readonly transport: ConnectorTransport) {}

  async sendLead(lead: ConnectorLead): Promise<void> {
    const email = requireEmail(lead)
    await ensureSuccess(await this.transport.request({
      method: 'POST',
      path: '/lists/subscribe',
      body: { email_address: email, status: 'subscribed' },
    }))
  }
}

export class SlackLeadConnector implements LeadConnector {
  constructor(private readonly transport: ConnectorTransport) {}

  async sendLead(lead: ConnectorLead): Promise<void> {
    const email = requireEmail(lead)
    await ensureSuccess(await this.transport.request({
      method: 'POST',
      path: '/chat.postMessage',
      body: { text: `New lead: ${email}` },
    }))
  }
}

function requireEmail(lead: ConnectorLead): string {
  const email = lead.data.email
  if (typeof email !== 'string' || !email.trim()) throw new Error(`Lead email is required: ${lead.id}`)
  return email.trim()
}

function withoutSecrets(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([key]) => !/(token|secret|password|api[_-]?key)/i.test(key)))
}

async function ensureSuccess(response: ConnectorResponse): Promise<void> {
  if (response.status < 200 || response.status >= 300) throw new Error(`Connector request failed with status ${response.status}`)
}
