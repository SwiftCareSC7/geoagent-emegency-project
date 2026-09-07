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
    setLoading(true)
    try {
      const result = await getSession()
      setUser(result.user)
      setError(result.error)
      return result.user
    } catch (err) {
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
    void refreshSession()
  }, [refreshSession])

  const login = useCallback(
    async (credentials: LoginPayload): Promise<User> => {
      setLoading(true)
      setError(null)
      try {
        const res = await authApi.login(credentials)
        setUser(res.user)
        return res.user
      } catch (err: unknown) {
        let message = 'Login failed. Please check your credentials.'
        if (err instanceof ApiError) {
          message = err.message
        } else if (err instanceof Error) {
          message = err.message
        }
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const signup = useCallback(
    async (
      data: RegisterPayload,
    ): Promise<{ success: boolean; message: string; user: User }> => {
      setLoading(true)
      setError(null)
      try {
        const res = await authApi.register(data)
        return res
      } catch (err: unknown) {
        let message = 'Registration failed'
        if (err instanceof ApiError) {
          message = err.message
        } else if (err instanceof Error) {
          message = err.message
        }
        setError(message)
        throw err
      } finally {
        setLoading(false)
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
      // Even if the network call fails, we clear client session
    } finally {
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
