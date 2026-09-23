import assert from "node:assert/strict"
import { getAuthProviderAvailability, resolveAuthMode } from "../src/lib/auth-config.mjs"

assert.equal(resolveAuthMode(), "local")
assert.equal(resolveAuthMode("local"), "local")
assert.equal(resolveAuthMode("keycloak"), "keycloak")
assert.equal(resolveAuthMode("hybrid"), "hybrid")
assert.equal(resolveAuthMode("unsupported"), "local")

assert.deepEqual(getAuthProviderAvailability({ AUTH_MODE: "local" }), {
  mode: "local",
  local: true,
  keycloak: false,
  keycloakMissing: [],
})

assert.deepEqual(getAuthProviderAvailability({ AUTH_MODE: "hybrid" }), {
  mode: "hybrid",
  local: true,
  keycloak: false,
  keycloakMissing: [
    "NEXT_PUBLIC_KEYCLOAK_URL",
    "AUTH_KEYCLOAK_REALM",
    "AUTH_KEYCLOAK_ID",
    "AUTH_KEYCLOAK_SECRET",
  ],
})

assert.deepEqual(getAuthProviderAvailability({
  AUTH_MODE: "keycloak",
  NEXT_PUBLIC_KEYCLOAK_URL: "http://localhost:8180",
  AUTH_KEYCLOAK_REALM: "master",
  AUTH_KEYCLOAK_ID: "nodepress",
  AUTH_KEYCLOAK_SECRET: "secret",
}), {
  mode: "keycloak",
  local: false,
  keycloak: true,
  keycloakMissing: [],
})

console.log("auth-config tests passed")
