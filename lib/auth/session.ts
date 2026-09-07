/**
 * SwiftCare GeoAgent — Session Management
 *
 * Handles authenticated user session retrieval from the backend.
 * Distinguishes expected 401 Unauthorized (normal unauthenticated visitor)
 * from network or 500 server errors.
 */

import { authApi } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/types'
import type { User } from './types'

export interface SessionResult {
  user: User | null
  error: string | null
  isNetworkError: boolean
}

/**
 * Attempt to retrieve the current session from GET /api/auth/me.
 *
 * Normal 401 status indicates no active session and returns user: null without throwing.
 * Network or server errors are captured in the error field.
 */
export async function getSession(): Promise<SessionResult> {
  try {
    const res = await authApi.getMe()
    return {
      user: res.user,
      error: null,
      isNetworkError: false,
    }
  } catch (err: unknown) {
    if (err instanceof ApiError) {
      // 401 Unauthorized is expected for unauthenticated users
      if (err.isUnauthorized) {
        return {
          user: null,
          error: null,
          isNetworkError: false,
        }
      }

      // Network connection failure (status 0)
      if (err.isNetworkError) {
        return {
          user: null,
          error: 'Unable to connect to SwiftCare server. Please check your network or verify the backend is running.',
          isNetworkError: true,
        }
      }

      // Other backend errors (e.g. 500)
      return {
        user: null,
        error: err.message,
        isNetworkError: false,
      }
    }

    const message = err instanceof Error ? err.message : 'Unexpected session retrieval error'
    return {
      user: null,
      error: message,
      isNetworkError: false,
    }
  }
}
