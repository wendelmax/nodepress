import assert from "node:assert/strict"

import { hasAdminAccess } from "../src/lib/access-control.mjs"

assert.equal(hasAdminAccess("admin"), true)
assert.equal(hasAdminAccess("administrator"), true)
assert.equal(hasAdminAccess("author"), false)
assert.equal(hasAdminAccess(undefined), false)

console.log("access-control tests passed")
