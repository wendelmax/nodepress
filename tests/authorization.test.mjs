import assert from "node:assert/strict"
import { canEditUser, canManageUsers, canChangeUserRole } from "../src/lib/authorization.mjs"

assert.equal(canManageUsers("admin"), true)
assert.equal(canManageUsers("administrator"), true)
assert.equal(canManageUsers("editor"), false)
assert.equal(canManageUsers(undefined), false)
assert.equal(canChangeUserRole("admin"), true)
assert.equal(canChangeUserRole("author"), false)
assert.equal(canEditUser("author", "7", "7"), true)
assert.equal(canEditUser("author", "7", "8"), false)
assert.equal(canEditUser("admin", "7", "8"), true)

console.log("authorization tests passed")
