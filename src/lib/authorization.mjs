import { hasAdminAccess } from "./role-normalization.mjs"

export function canManageUsers(role) {
  return hasAdminAccess(role)
}

export function canChangeUserRole(role) {
  return hasAdminAccess(role)
}

export function canEditUser(role, actorId, targetId) {
  return canManageUsers(role) || String(actorId) === String(targetId)
}
