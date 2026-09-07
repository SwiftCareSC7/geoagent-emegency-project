/**
 * SwiftCare GeoAgent — Centralized HTTP Client
 *
 * Every frontend API call goes through this client. It handles:
 * - Base URL from environment variable
 * - JSON headers
 * - Cookie-based authentication (credentials: 'include')
 * - Response parsing and error normalization
 *
 * The backend authenticates via HTTP-only cookies set at login.
 * No Bearer token management is needed on the client side.
 */

import { ApiError } from './types'

const BASE_URL: string =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

/**
 * Parse a fetch Response into typed JSON, or throw a normalized ApiError.
 */
async function handleResponse<T>(res: Response): Promise<T> {
  // Attempt to parse JSON even on error responses
  let body: Record<string, unknown> | null = null
  try {
    body = (await res.json()) as Record<string, unknown>
  } catch {
    // Response body is not valid JSON
  }

  if (!res.ok) {
    const message =
      (body?.error as string) ||
      (body?.message as string) ||
      `Request failed with status ${res.status}`
    throw new ApiError(res.status, message)
  }

  // The backend always wraps data in { success: true, ... }
  // Return the full body so callers can destructure { data }, { user }, etc.
  return body as T
}

/**
 * Build a full URL with optional query parameters.
 */
function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
): string {
  const url = new URL(`${BASE_URL}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

/**
 * Shared request options applied to every fetch call.
 */
const defaultInit: RequestInit = {
  credentials: 'include', // Send HTTP-only cookies
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
}

async function executeRequest<T>(url: string, init: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown network failure'
    throw new ApiError(0, `Network connection failed: ${errorMsg}`)
  }
  return handleResponse<T>(res)
}

// ---------------------------------------------------------------------------
// Public HTTP methods
// ---------------------------------------------------------------------------

/** Send a GET request */
export async function get<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  return executeRequest<T>(buildUrl(path, params), {
    ...defaultInit,
    method: 'GET',
  })
}

/** Send a POST request with a JSON body */
export async function post<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  return executeRequest<T>(buildUrl(path), {
    ...defaultInit,
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/** Send a PATCH request with a JSON body */
export async function patch<T>(
  path: string,
  body?: unknown,
): Promise<T> {
  return executeRequest<T>(buildUrl(path), {
    ...defaultInit,
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/** Send a DELETE request */
export async function del<T>(path: string): Promise<T> {
  return executeRequest<T>(buildUrl(path), {
    ...defaultInit,
    method: 'DELETE',
  })
}
