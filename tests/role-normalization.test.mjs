import assert from "node:assert/strict"
import { hasAdminAccess, normalizeRole } from "../src/lib/role-normalization.mjs"

assert.equal(normalizeRole("admin"), "admin")
assert.equal(normalizeRole("administrator"), "admin")
assert.equal(normalizeRole("editor"), "editor")
assert.equal(normalizeRole("author"), "author")
assert.equal(normalizeRole("contributor"), "contributor")
assert.equal(normalizeRole("subscriber"), "subscriber")
assert.equal(normalizeRole("unknown"), "subscriber")
assert.equal(normalizeRole(undefined), "subscriber")

assert.equal(hasAdminAccess("admin"), true)
assert.equal(hasAdminAccess("administrator"), true)
assert.equal(hasAdminAccess("author"), false)

console.log("role-normalization tests passed")
