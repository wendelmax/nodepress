const SUPPORTED_ROLES = new Set(["admin", "editor", "author", "contributor", "subscriber"])

export function normalizeRole(value) {
  const role = String(value || "").trim().toLowerCase()
  if (role === "administrator" || role === "admin") return "admin"
  return SUPPORTED_ROLES.has(role) ? role : "subscriber"
}

export function hasAdminAccess(value) {
  return normalizeRole(value) === "admin"
}
