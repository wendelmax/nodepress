import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"

const baseUrl = process.env.BASE_URL || "http://localhost:3000"
const outputDir = path.resolve("artifacts/wiki-screenshots-auth-local")
const reportPath = path.resolve("artifacts/ui-validation-auth-local.json")
const adminEmail = "nodepress.local@example.com"
const adminPassword = "LocalPass123!"

await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()

async function goto(name, route) {
  const consoleErrors = []
  const pageErrors = []
  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  }
  const onPageError = (error) => pageErrors.push(error.message)
  page.on("console", onConsole)
  page.on("pageerror", onPageError)

  let response
  let error = null
  let networkIdleTimeout = false
  try {
    response = await page.goto(new URL(route, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    })
    try {
      await page.waitForLoadState("networkidle", { timeout: 5000 })
    } catch {
      networkIdleTimeout = true
    }
    await page.screenshot({ path: path.join(outputDir, `${name}.png`), fullPage: true })
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught)
  }

  const result = {
    name,
    route,
    status: response?.status() ?? null,
    finalUrl: page.url(),
    title: await page.title().catch(() => ""),
    consoleErrors,
    pageErrors,
    networkIdleTimeout,
    error,
  }
  page.off("console", onConsole)
  page.off("pageerror", onPageError)
  return result
}

const expectedRedirects = {
  "/admin/pages": "/admin/posts?post_type=page",
}

const results = []

await page.goto(new URL("/admin/install", baseUrl).toString(), { waitUntil: "networkidle" })
if (page.url().includes("/admin/install")) {
  await page.locator("#site-title").fill("NodePress Local Validation")
  await page.locator("#admin-username").fill("localadmin")
  await page.locator("#admin-password").fill(adminPassword)
  await page.locator("#admin-email").fill(adminEmail)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/login\?installed=true/, { timeout: 20000 })
}

await page.goto(new URL("/login", baseUrl).toString(), { waitUntil: "networkidle" })
if (!page.url().includes("/login")) {
  throw new Error(`Expected login page, got ${page.url()}`)
}

await page.locator("#identifier").fill(adminEmail)
await page.locator("#password").fill(adminPassword)
await page.locator('form button[type="submit"]').click()
await page.waitForURL(/\/admin(?:$|\?)/, { timeout: 20000 })

const adminRoutes = [
  ["admin-dashboard", "/admin"],
  ["admin-posts", "/admin/posts"],
  ["admin-post-new", "/admin/posts/new"],
  ["admin-pages", "/admin/pages"],
  ["admin-forms", "/admin/forms"],
  ["admin-forms-new", "/admin/forms/new"],
  ["admin-media", "/admin/media"],
  ["admin-upload", "/admin/upload"],
  ["admin-comments", "/admin/comments"],
  ["admin-categories", "/admin/categories"],
  ["admin-tags", "/admin/tags"],
  ["admin-menus", "/admin/menus"],
  ["admin-themes", "/admin/themes"],
  ["admin-plugins", "/admin/plugins"],
  ["admin-settings-general", "/admin/settings/general"],
  ["admin-settings-reading", "/admin/settings/reading"],
  ["admin-settings-seo", "/admin/settings/seo"],
  ["admin-settings-storage", "/admin/settings/storage"],
  ["admin-settings-ai", "/admin/settings/ai"],
  ["admin-settings-fields", "/admin/settings/fields"],
  ["admin-settings-cpt", "/admin/settings/cpt"],
  ["admin-settings-permalinks", "/admin/settings/permalinks"],
  ["admin-tools-import-export", "/admin/tools/import-export"],
  ["admin-users", "/admin/users"],
  ["admin-users-new", "/admin/users/new"],
  ["admin-profile", "/admin/profile"],
  ["admin-leads", "/admin/leads"],
  ["admin-appearance-footer", "/admin/appearance/footer"],
]

for (const [name, route] of adminRoutes) {
  results.push(await goto(name, route))
}

const report = {
  baseUrl,
  authMode: "local",
  keycloak: false,
  installedAndAuthenticated: true,
  generatedAt: new Date().toISOString(),
  credentials: { identifier: adminEmail, password: "[redacted]" },
  routes: results,
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
await browser.close()

const failed = results.filter((result) =>
  result.error || result.pageErrors.length > 0 || result.consoleErrors.length > 0 ||
  (result.status !== null && result.status >= 400) ||
  (!result.finalUrl.includes(result.route) && result.finalUrl !== new URL(expectedRedirects[result.route] || result.route, baseUrl).toString()),
)

console.log(JSON.stringify({ reportPath, screenshots: outputDir, failed, checked: results.length }, null, 2))
if (failed.length > 0) process.exitCode = 1
