import assert from "node:assert/strict"
import { linkKeycloakIdentity } from "../src/lib/user-identity-linking.mjs"

const makeRepo = (bySub, byEmail) => {
  const calls = []
  return {
    calls,
    async findByKeycloakSub() { return bySub },
    async findByEmail() { return byEmail },
    async linkByEmail(id, keycloakSub) {
      calls.push(["link", id, keycloakSub])
      return { ...byEmail, keycloakSub }
    },
    async create(data) {
      calls.push(["create", data])
      return { id: 10, ...data }
    },
  }
}

const alreadyLinkedRepo = makeRepo({ id: 2, keycloakSub: "sub-2" }, null)
const alreadyLinked = await linkKeycloakIdentity(
  { keycloakSub: "sub-2", email: "admin@example.com" },
  alreadyLinkedRepo,
)
assert.equal(alreadyLinked.created, false)
assert.equal(alreadyLinked.linked, false)
assert.equal(alreadyLinked.user.id, 2)
assert.equal(alreadyLinked.linkedBy, "keycloakSub")
assert.deepEqual(alreadyLinkedRepo.calls, [])

const emailRepo = makeRepo(null, { id: 3, userEmail: "editor@example.com", userPass: "local-hash", keycloakSub: null })
const linkedByEmail = await linkKeycloakIdentity(
  { keycloakSub: "sub-3", email: "editor@example.com", name: "Editor" },
  emailRepo,
)
assert.equal(linkedByEmail.linked, true)
assert.equal(linkedByEmail.userId, 3)
assert.equal(linkedByEmail.linkedBy, "email")
assert.equal(linkedByEmail.user.userPass, "local-hash")
assert.deepEqual(emailRepo.calls, [["link", 3, "sub-3"]])

const createRepo = makeRepo(null, null)
const created = await linkKeycloakIdentity(
  {
    keycloakSub: "sub-4",
    email: "new.admin@example.com",
    name: "New Admin",
    roles: ["nodepress-admin"],
  },
  createRepo,
)
assert.equal(created.created, true)
assert.equal(created.user.role, "admin")
assert.equal(created.user.userLogin, "new.admin")
assert.equal(created.linkedBy, "created")
assert.equal(createRepo.calls[0][0], "create")
assert.equal("userPass" in createRepo.calls[0][1], false)

const conflictRepo = makeRepo(null, { id: 5, userEmail: "claimed@example.com", keycloakSub: "other-sub" })
const conflict = await linkKeycloakIdentity(
  { keycloakSub: "sub-5", email: "claimed@example.com" },
  conflictRepo,
)
assert.equal(conflict.conflict, true)
assert.deepEqual(conflictRepo.calls, [])

console.log("user-identity-linking tests passed")
