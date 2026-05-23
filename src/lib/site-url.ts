import { OptionService } from '@/services/option.service'

/**
 * Returns the canonical site URL from the database options.
 * Falls back to the request origin (for server-side usage) or localhost.
 *
 * Priority:
 *  1. `siteurl` stored in np_options (set during install and editable in General Settings)
 *  2. `request` headers origin (auto-discovery from incoming HTTP request)
 *  3. `NEXTAUTH_URL` env variable (set during setup wizard)
 *  4. Hardcoded localhost fallback (dev only)
 */
export async function getSiteUrl(request?: Request): Promise<string> {
  // 1. Try database
  try {
    const options = await OptionService.getOptions(['siteurl'])
    if (options['siteurl']) {
      return options['siteurl'].replace(/\/$/, '') // strip trailing slash
    }
  } catch {
    // DB not available yet (e.g. during install), fall through
  }

  // 2. Try to infer from incoming request headers
  if (request) {
    return getOriginFromRequest(request)
  }

  // 3. Fall back to env
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '')
  }

  // 4. Dev fallback
  return 'http://localhost:3000'
}

/**
 * Derives the origin URL purely from the incoming request headers.
 * Useful during install before siteurl is stored, and in edge environments.
 */
export function getOriginFromRequest(request: Request): string {
  const host = request.headers.get('host') || 'localhost:3000'
  const proto =
    request.headers.get('x-forwarded-proto') ||
    (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
