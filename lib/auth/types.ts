/**
 * SwiftCare GeoAgent — Frontend Auth Types
 */

import type { User, UserRole, LoginPayload, RegisterPayload } from '@/lib/api/types'

export type { User, UserRole, LoginPayload, RegisterPayload }

export interface AuthContextType {
  /** The currently authenticated user, or null if unauthenticated */
  user: User | null

  /** True while the session is being initialized or an auth action is in flight */
  loading: boolean

  /** Convenience boolean for !!user */
  authenticated: boolean

  /** Current auth error message, or null if no error */
  error: string | null

  /**
   * Log in with email and password.
   * On success, sets the HTTP-only cookie, updates auth state, and returns the User.
   */
  login: (credentials: LoginPayload) => Promise<User>

  /**
   * Register a new user account.
   * Returns the registered user and success message.
   */
  signup: (data: RegisterPayload) => Promise<{ success: boolean; message: string; user: User }>

  /**
   * Log out, invalidate the session cookie on the backend, and clear client auth state.
   */
  logout: () => Promise<void>

  /**
   * Re-fetch the current authenticated user session from the backend (/api/auth/me).
   */
  refreshSession: () => Promise<User | null>

  /** Clear the active error state */
  clearError: () => void
}
