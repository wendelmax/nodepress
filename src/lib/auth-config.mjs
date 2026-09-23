export const KEYCLOAK_ENV_KEYS = [
  "NEXT_PUBLIC_KEYCLOAK_URL",
  "AUTH_KEYCLOAK_REALM",
  "AUTH_KEYCLOAK_ID",
  "AUTH_KEYCLOAK_SECRET",
]

export function resolveAuthMode(value) {
  const mode = String(value || "local").trim().toLowerCase()
  return mode === "keycloak" || mode === "hybrid" ? mode : "local"
}

export function getAuthProviderAvailability(env = {}) {
  const mode = resolveAuthMode(env.AUTH_MODE)
  const keycloakMissing = mode === "local"
    ? []
    : KEYCLOAK_ENV_KEYS.filter((key) => !env[key])

  return {
    mode,
    local: mode !== "keycloak",
    keycloak: mode !== "local" && keycloakMissing.length === 0,
    keycloakMissing,
  }
}
