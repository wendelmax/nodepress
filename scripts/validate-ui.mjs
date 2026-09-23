import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { chromium } from "playwright"

const baseUrl = process.env.BASE_URL || "http://localhost:3000"
const artifactSuffix = process.env.ARTIFACT_SUFFIX || ""
const outputDir = path.resolve(`artifacts/wiki-screenshots${artifactSuffix}`)
const reportPath = path.resolve(`artifacts/ui-validation${artifactSuffix}.json`)

await mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const results = []

async function checkRoute(name, route, screenshot = true) {
  const url = new URL(route, baseUrl).toString()
  const consoleErrors = []
  const pageErrors = []

  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text())
  }
  const onPageError = (error) => pageErrors.push(error.message)

  page.on("console", onConsole)
  page.on("pageerror", onPageError)

  let response
  let error
  try {
    response = await page.goto(url, { waitUntil: "networkidle", timeout: 15000 })
    if (screenshot) {
      await page.screenshot({
        path: path.join(outputDir, `${name}.png`),
        fullPage: true,
      })
    }
  } catch (caught) {
    error = caught.message
  }

  results.push({
    name,
    route,
    status: response?.status() ?? null,
    finalUrl: page.url(),
    title: await page.title().catch(() => ""),
    consoleErrors,
    pageErrors,
    error: error || null,
  })

  page.off("console", onConsole)
  page.off("pageerror", onPageError)
}

await checkRoute("root", "/")
await checkRoute("setup-config", "/setup-config")
await checkRoute("setup-config-db", "/setup-config?step=1&lang=pt_BR")
await checkRoute("install", "/admin/install")
await checkRoute("login", "/login")
await checkRoute("category", "/category/example")
await checkRoute("tag", "/tag/example")
await checkRoute("robots", "/robots.txt", false)
await checkRoute("sitemap", "/sitemap.xml", false)

const authConfigResponse = await page.goto(new URL("/api/auth/config", baseUrl).toString(), { waitUntil: "networkidle" })
const authConfig = authConfigResponse?.ok() ? await authConfigResponse.json() : null

const adminRoutes = [
  ["admin-dashboard", "/admin"],
  ["admin-posts", "/admin/posts"],
  ["admin-pages", "/admin/pages"],
  ["admin-forms", "/admin/forms"],
  ["admin-media", "/admin/media"],
  ["admin-comments", "/admin/comments"],
  ["admin-categories", "/admin/categories"],
  ["admin-tags", "/admin/tags"],
  ["admin-menus", "/admin/menus"],
  ["admin-themes", "/admin/themes"],
  ["admin-plugins", "/admin/plugins"],
  ["admin-settings-general", "/admin/settings/general"],
  ["admin-settings-seo", "/admin/settings/seo"],
  ["admin-settings-storage", "/admin/settings/storage"],
  ["admin-settings-ai", "/admin/settings/ai"],
  ["admin-settings-fields", "/admin/settings/fields"],
  ["admin-settings-cpt", "/admin/settings/cpt"],
  ["admin-settings-permalinks", "/admin/settings/permalinks"],
  ["admin-tools-import-export", "/admin/tools/import-export"],
  ["admin-users", "/admin/users"],
  ["admin-profile", "/admin/profile"],
]

for (const [name, route] of adminRoutes) {
  await checkRoute(name, route, false)
}

await page.goto(new URL("/setup-config", baseUrl).toString(), { waitUntil: "networkidle" })
const languageButton = page.getByRole("button", { name: "Português do Brasil" })
await Promise.all([
  page.waitForURL(/step=1.*lang=pt_BR/),
  languageButton.click(),
])
const languageUrl = page.url()
await page.screenshot({ path: path.join(outputDir, "setup-config-pt-br.png"), fullPage: true })

await page.goto(new URL("/admin/install?lang=en", baseUrl).toString(), { waitUntil: "networkidle" })
const installerRedirectedToLogin = page.url().includes("/login")
const installInputs = {
  siteTitle: await page.locator("#site-title").count(),
  username: await page.locator("#admin-username").count(),
  email: await page.locator("#admin-email").count(),
  password: await page.locator('input[type="password"]').count(),
}

await page.goto(new URL("/login", baseUrl).toString(), { waitUntil: "networkidle" })
const loginFinalUrl = page.url()
const loginInputs = {
  identifier: await page.locator("#identifier").count(),
  password: await page.locator("#password").count(),
  keycloak: await page.getByRole("button", { name: "Entrar com Navant ID" }).count(),
}

const report = {
  baseUrl,
  authConfig,
  generatedAt: new Date().toISOString(),
  languageSelection: {
    url: languageUrl,
    passed: languageUrl.includes("step=1") && languageUrl.includes("lang=pt_BR"),
  },
  installerFields: {
    ...installInputs,
    redirectedToLogin: installerRedirectedToLogin,
    passed: Boolean(authConfig) && (installerRedirectedToLogin || (installInputs.siteTitle === 1 && installInputs.username === 1 && installInputs.email === 1 && installInputs.password === (authConfig.local ? 1 : 0))),
  },
  loginFields: {
    finalUrl: loginFinalUrl,
    ...loginInputs,
    passed: loginFinalUrl.includes("/setup-config") || (Boolean(authConfig) && loginInputs.identifier === (authConfig.local ? 1 : 0) && loginInputs.password === (authConfig.local ? 1 : 0) && loginInputs.keycloak === (authConfig.keycloak ? 1 : 0)),
  },
  routes: results,
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`)
await browser.close()

const failed = [
  ...results.filter((result) => result.error || result.pageErrors.length > 0 || (result.status !== null && result.status >= 500)),
  ...(report.languageSelection.passed ? [] : [{ name: "language-selection" }]),
  ...(report.installerFields.passed ? [] : [{ name: "installer-fields" }]),
  ...(report.loginFields.passed ? [] : [{ name: "login-fields" }]),
]

console.log(JSON.stringify({ reportPath, screenshots: outputDir, failed, results }, null, 2))
if (failed.length > 0) process.exitCode = 1
