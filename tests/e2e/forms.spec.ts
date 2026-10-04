import { test, expect } from 'playwright/test'

const enabled = Boolean(process.env.PLAYWRIGHT_BASE_URL)

test.describe('Form Engine migration', () => {
  test.skip(!enabled, 'Set PLAYWRIGHT_BASE_URL to run against a local NodePress server')

  test('canonical route rejects malformed payloads before persistence', async ({ request }) => {
    const response = await request.post('/api/forms/form-does-not-matter/submissions', { data: { values: 'invalid' } })
    expect(response.status()).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: 'invalid_request' })
  })

  test('legacy route exposes a canonical successor during deprecation', async ({ request }) => {
    const response = await request.post('/api/forms/submit', { data: { formId: '999999999', email: 'test@example.test' } })
    expect(response.status()).toBe(404)
    expect(response.headers().deprecation).toBe('true')
    expect(response.headers().sunset).toBeTruthy()
    expect(response.headers().link).toContain('/api/forms/')
  })
})
