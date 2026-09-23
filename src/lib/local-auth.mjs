import bcrypt from "bcryptjs"
import { normalizeRole } from "./role-normalization.mjs"

function roleFromMeta(meta = []) {
  const capabilities = meta.find((item) => item?.metaKey === "capabilities")?.metaValue
  if (!capabilities) return "subscriber"

  try {
    const parsed = JSON.parse(capabilities)
    const role = Object.entries(parsed).find(([, enabled]) => enabled)?.[0]
    return normalizeRole(role)
  } catch {
    const legacyRole = capabilities.match(/administrator|admin|editor|author|contributor|subscriber/i)?.[0]
    return normalizeRole(legacyRole)
  }
}

export async function verifyLocalCredentials(credentials, findUser) {
  const identifier = String(credentials?.identifier || "").trim()
  const password = String(credentials?.password || "")
  if (!identifier || !password) return null

  const user = await findUser(identifier)
  if (!user?.userPass || !(await bcrypt.compare(password, user.userPass))) return null

  return {
    id: String(user.id),
    name: user.displayName || user.userLogin,
    email: user.userEmail,
    role: roleFromMeta(user.meta),
  }
}
