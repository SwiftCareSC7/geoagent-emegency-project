/**
 * SwiftCare GeoAgent — Auth API
 *
 * Backend routes:
 *   POST /api/auth/register  — public
 *   POST /api/auth/login     — public (sets HTTP-only cookie)
 *   POST /api/auth/logout    — clears cookie
 *   GET  /api/auth/me        — protected
 */

import { get, post } from './client'
import type { User, RegisterPayload, LoginPayload } from './types'

interface RegisterResponse {
  success: true
  message: string
  user: User
}

interface LoginResponse {
  success: true
  message: string
  user: User
}

interface LogoutResponse {
  success: true
  message: string
}

interface MeResponse {
  success: true
  user: User
}

export const authApi = {
  /** Register a new user account */
  register(data: RegisterPayload): Promise<RegisterResponse> {
    return post<RegisterResponse>('/auth/register', data)
  },

  /** Log in and receive an HTTP-only authentication cookie */
  login(data: LoginPayload): Promise<LoginResponse> {
    return post<LoginResponse>('/auth/login', data)
  },

  /** Log out and clear the authentication cookie */
  logout(): Promise<LogoutResponse> {
    return post<LogoutResponse>('/auth/logout')
  },

  /** Get the currently authenticated user profile */
  getMe(): Promise<MeResponse> {
    return get<MeResponse>('/auth/me')
  },
}
