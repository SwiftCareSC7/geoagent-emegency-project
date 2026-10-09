'use client'

/**
 * SwiftCare GeoAgent — Auth Context & Provider
 *
 * Provides reactive authentication state across the entire Next.js application.
 * Manages user session lifecycle, login, signup, logout, and automatic session restoration.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { authApi } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/types'
import { getSession } from './session'
import type {
  AuthContextType,
  LoginPayload,
  RegisterPayload,
  User,
} from './types'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const refreshSession = useCallback(async (): Promise<User | null> => {
    // Only show loading if we don't already have an optimistic user
    if (typeof window !== 'undefined' && !localStorage.getItem('swiftcare_user')) {
      setLoading(true)
    }
    try {
      const result = await getSession()
      if (result.user) {
        setUser(result.user)
        setError(null)
        if (typeof window !== 'undefined') {
          localStorage.setItem('swiftcare_user', JSON.stringify(result.user))
        }
        return result.user
      }

      // If backend explicitly returns unauthenticated (401), clear local storage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('swiftcare_user')
      }
      setUser(null)
      setError(result.error)
      return null
    } catch (err) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('swiftcare_user')
      }
      const message = err instanceof Error ? err.message : 'Failed to refresh session'
      setError(message)
      setUser(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Initialize session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('swiftcare_user')
        if (stored) {
          setUser(JSON.parse(stored) as User)
        }
      } catch {}
    }
    void refreshSession()
  }, [refreshSession])

  const login = useCallback(
    async (credentials: LoginPayload): Promise<User> => {
      setError(null)
      try {
        const res = await authApi.login({
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        })
        const loggedUser = res.user

        setUser(loggedUser)
        if (typeof window !== 'undefined') {
          localStorage.setItem('swiftcare_user', JSON.stringify(loggedUser))
        }
        return loggedUser
      } catch (err: unknown) {
        let message = 'Login failed. Please check your credentials.'
        if (err instanceof ApiError) {
          message = err.message
        } else if (err instanceof Error) {
          message = err.message
        }
        setError(message)
        throw err
      }
    },
    [],
  )

  const signup = useCallback(
    async (
      data: RegisterPayload,
    ): Promise<{ success: boolean; message: string; user: User }> => {
      setError(null)
      try {
        const res = await authApi.register({
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          password: data.password,
          role: data.role,
          assignedVehicleId: data.assignedVehicleId,
        })
        return res
      } catch (err: unknown) {
        let message = 'Registration failed. Please check your information.'
        if (err instanceof ApiError) {
          message = err.message
        } else if (err instanceof Error) {
          message = err.message
        }
        setError(message)
        throw err
      }
    },
    [],
  )

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      await authApi.logout()
    } catch {
      // Even if network call fails
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('swiftcare_user')
      }
      setUser(null)
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      authenticated: !!user,
      error,
      login,
      signup,
      logout,
      refreshSession,
      clearError,
    }),
    [user, loading, error, login, signup, logout, refreshSession, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Access the application's authentication context.
 * Must be used within an <AuthProvider>.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return context
}
