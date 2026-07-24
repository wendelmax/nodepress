// Server-only module: acquires and caches a Keycloak client_credentials
// token for calling svc-admissions as an internal service. Mirrors
// navant-edu-backend's packages/core/auth/service_token.go exactly (same
// token endpoint shape, same 30s expiry margin) since NodePress can't
// import Go code directly. Never import this from a client component.

let cachedToken: string | null = null
let expiresAt = 0

async function fetchServiceToken(): Promise<string> {
  const keycloakBase = process.env.NEXT_PUBLIC_KEYCLOAK_URL || "http://localhost:8180"
  const realm = process.env.INTERNAL_SERVICE_REALM || "master"
  const clientId = process.env.INTERNAL_SERVICE_CLIENT_ID
  const clientSecret = process.env.INTERNAL_SERVICE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("INTERNAL_SERVICE_CLIENT_ID/INTERNAL_SERVICE_CLIENT_SECRET not configured")
  }

  const tokenUrl = `${keycloakBase}/realms/${realm}/protocol/openid-connect/token`
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  })

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`service token: status ${res.status}: ${text}`)
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) {
    throw new Error("service token: response missing access_token")
  }

  cachedToken = data.access_token
  expiresAt = Date.now() + (data.expires_in ?? 60) * 1000 - 30_000
  return cachedToken
}

export async function getServiceToken(): Promise<string> {
  if (cachedToken && Date.now() < expiresAt) {
    return cachedToken
  }
  return fetchServiceToken()
}

export function admissionsBaseUrl(): string {
  return process.env.ADMISSIONS_SVC_URL || "http://admissions:8103"
}

export function tenantId(): string {
  const id = process.env.TENANT_ID
  if (!id) {
    throw new Error("TENANT_ID not configured")
  }
  return id
}
