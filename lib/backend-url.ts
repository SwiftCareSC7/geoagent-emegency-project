/**
 * Resolve the Express backend origin for server-side (BFF) calls.
 * Returns null in production when it is unset or points at localhost, so callers fail closed (503).
 * A trailing `/` or `/api` is stripped because callers append `/api/...` themselves.
 */
export function getBackendUrl(): string | null {
  const isProd = process.env.NODE_ENV === 'production'
  const raw = process.env.BACKEND_SERVICE_URL || process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || (isProd ? '' : 'http://localhost:5001')
  const url = raw.trim().replace(/\/+$/, '').replace(/\/api$/, '')
  if (!url || (isProd && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(url))) {
    console.error('[BFF] BACKEND_URL/BACKEND_SERVICE_URL is missing or points to localhost in production; set it to the deployed Express backend origin')
    return null
  }
  return url
}

/** Upper bound for any BFF → Express call so a hung backend fails closed (503) instead of hanging the request. */
export const BACKEND_TIMEOUT_MS = 10_000

/** Forward the browser's session cookie so Express can authenticate and authorize the BFF call. */
export async function backendAuthHeaders(): Promise<Record<string, string>> {
  const { headers } = await import('next/headers')
  const cookie = (await headers()).get('cookie')
  return cookie ? { cookie } : {}
}
