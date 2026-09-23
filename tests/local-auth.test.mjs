import assert from "node:assert/strict"
import bcrypt from "bcryptjs"
import { verifyLocalCredentials } from "../src/lib/local-auth.mjs"

const passwordHash = await bcrypt.hash("correct horse", 4)
const user = {
  id: 7,
  userLogin: "editor",
  userEmail: "editor@example.com",
  userPass: passwordHash,
  displayName: "Editorial User",
  meta: [{ metaKey: "capabilities", metaValue: JSON.stringify({ editor: true }) }],
}

const findUser = async (identifier) => {
  if (["editor", "editor@example.com"].includes(identifier)) return user
  return null
}

const authenticated = await verifyLocalCredentials(
  { identifier: "editor@example.com", password: "correct horse" },
  findUser,
)
assert.equal(authenticated.id, "7")
assert.equal(authenticated.role, "editor")
assert.equal(authenticated.email, "editor@example.com")
assert.equal(authenticated.password, undefined)

assert.equal(
  await verifyLocalCredentials({ identifier: "editor", password: "wrong" }, findUser),
  null,
)
assert.equal(
  await verifyLocalCredentials({ identifier: "unknown", password: "correct horse" }, findUser),
  null,
)
assert.equal(
  await verifyLocalCredentials(
    { identifier: "no-password", password: "correct horse" },
    async () => ({ ...user, userLogin: "no-password", userPass: "" }),
  ),
  null,
)

console.log("local-auth tests passed")
