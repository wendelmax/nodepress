import { normalizeRole } from "./role-normalization.mjs"

function loginFromIdentity(email, keycloakSub) {
  const localPart = String(email || keycloakSub).split("@")[0]
  const login = localPart.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "")
  return (login || `keycloak-${keycloakSub}`).slice(0, 60)
}

function roleFromKeycloakRoles(roles = []) {
  if (roles.includes("nodepress-admin")) return "admin"
  if (roles.includes("nodepress-editor")) return "editor"
  if (roles.includes("nodepress-author")) return "author"
  if (roles.includes("nodepress-contributor")) return "contributor"
  return "subscriber"
}

export async function linkKeycloakIdentity(identity, repository) {
  const keycloakSub = String(identity?.keycloakSub || "").trim()
  if (!keycloakSub) throw new Error("keycloakSub is required")

  const existingBySub = await repository.findByKeycloakSub(keycloakSub)
  if (existingBySub) return { user: existingBySub, userId: existingBySub.id, created: false, linked: false, linkedBy: "keycloakSub" }

  const email = String(identity?.email || "").trim().toLowerCase()
  const existingByEmail = email ? await repository.findByEmail(email) : null
  if (existingByEmail) {
    if (existingByEmail.keycloakSub && existingByEmail.keycloakSub !== keycloakSub) {
      return { user: existingByEmail, userId: existingByEmail.id, created: false, linked: false, linkedBy: "conflict", conflict: true }
    }
    const linkedUser = await repository.linkByEmail(existingByEmail.id, keycloakSub)
    return { user: linkedUser, userId: linkedUser.id, created: false, linked: true, linkedBy: "email" }
  }

  const role = normalizeRole(roleFromKeycloakRoles(identity?.roles || []))
  const login = loginFromIdentity(email, keycloakSub)
  const user = await repository.create({
    keycloakSub,
    userLogin: login,
    userEmail: email || `${keycloakSub}@keycloak.local`,
    userNicename: login.slice(0, 50),
    displayName: identity?.name || email || login,
    role,
  })
  return { user, userId: user.id, created: true, linked: false, linkedBy: "created" }
}
