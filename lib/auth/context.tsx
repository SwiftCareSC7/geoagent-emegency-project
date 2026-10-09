/**
 * SwiftCare GeoAgent — Auth Compatibility Shim
 * Authentication is disabled across SwiftCare GeoAgent.
 * This compatibility layer ensures that any open editor buffers or components
 * resolve clean types and runtime hooks without requiring login.
 */

'use client'

import React from 'react'

export interface User {
  id?: string
  name?: string
  email?: string
  role?: string
}

export interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (...args: any[]) => Promise<any> | void
  logout: () => void
}

const defaultAuthContext: AuthContextType = {
  user: {
    id: 'operator-108',
    name: 'Ananya Rao',
    role: 'driver',
  },
  token: null,
  isAuthenticated: true,
  isLoading: false,
  login: async () => {},
  logout: () => {},
}

const AuthContext = React.createContext<AuthContextType>(defaultAuthContext)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={defaultAuthContext}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  return React.useContext(AuthContext) || defaultAuthContext
}

export default AuthContext
