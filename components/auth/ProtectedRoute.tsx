'use client'

import { Ambulance, Loader2, ShieldAlert, Clock, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'
import type { UserRole, Workspace } from '@/lib/api/types'
import { getRoleDashboard, getEffectiveWorkspaces } from '@/lib/auth/roles'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  allowedWorkspaces?: Workspace[]
}

/**
 * Route protection wrapper for authenticated pages.
 *
 * Prevents content flashing by rendering an accessible loading state while the
 * session is being verified against GET /api/auth/me.
 *
 * Enforces:
 * 1. Active authentication (redirects to /login if unauthenticated)
 * 2. Active account status (blocks PENDING or SUSPENDED accounts)
 * 3. Authoritative role & workspace permissions (denies unauthorized direct visits)
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  allowedWorkspaces,
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading, authenticated, logout } = useAuth()

  useEffect(() => {
    if (!loading && !authenticated) {
      router.replace('/login')
    }
  }, [loading, authenticated, router])

  // 1. Session verification in progress
  if (loading) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Ambulance className="size-7 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="font-display text-base font-semibold text-foreground">
              Verifying SwiftCare session...
            </p>
            <p className="text-xs text-muted-foreground">
              Connecting securely to emergency control service
            </p>
          </div>
          <Loader2 className="size-5 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  // 2. Unauthenticated (effect handles redirect)
  if (!authenticated || !user) {
    return null
  }

  // 3. Status Check: PENDING Account
  if (user.status === 'PENDING') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-card p-6 text-center shadow-lg sm:p-8 space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
            <Clock className="size-7 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-xl font-bold text-card-foreground">
              Registration Pending Approval
            </h2>
            <p className="text-xs text-muted-foreground">
              Your account (<span className="font-mono text-foreground">{user.email}</span>) is registered but requires administrator verification before dashboard access is permitted.
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-left text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requested Role:</span>
              <span className="font-semibold text-foreground">{user.requestedRole || user.role}</span>
            </div>
            {user.requestedWorkspaces && user.requestedWorkspaces.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested Workspaces:</span>
                <span className="font-mono text-foreground">{user.requestedWorkspaces.join(', ')}</span>
              </div>
            )}
          </div>
          <div className="pt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => logout()} className="w-full gap-2 text-xs">
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </Button>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full text-xs">
                Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 4. Status Check: SUSPENDED Account
  if (user.status === 'SUSPENDED') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-6 text-center shadow-lg sm:p-8 space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
            <ShieldAlert className="size-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-xl font-bold text-card-foreground">
              Account Suspended
            </h2>
            <p className="text-xs text-muted-foreground">
              Your account access has been revoked by an administrator. All protected dashboards and emergency services are disabled.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={() => logout()} className="w-full gap-2 text-xs">
              <LogOut className="size-3.5" />
              <span>Sign Out</span>
            </Button>
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full text-xs">
                Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 5. Role and Workspace Permission Check
  // ADMIN has full access everywhere
  if (user.role !== 'ADMIN') {
    const userWorkspaces = getEffectiveWorkspaces(user)

    const matchesRole = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(user.role)
    const matchesWorkspace = !allowedWorkspaces || allowedWorkspaces.length === 0 || allowedWorkspaces.some(ws => userWorkspaces.includes(ws))
    // If allowedRoles is defined, having a permitted workspace matching that role name grants access
    const matchesWorkspaceRole = allowedRoles ? allowedRoles.some(r => userWorkspaces.includes(r as Workspace)) : false

    const isAuthorized = matchesRole || matchesWorkspace || matchesWorkspaceRole

    if (!isAuthorized) {
      const defaultDashboard = getRoleDashboard(user.role)
      return (
        <div className="flex min-h-svh items-center justify-center bg-background p-6">
          <div className="w-full max-w-md rounded-2xl border border-destructive/20 bg-card p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldAlert className="size-6" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold text-card-foreground">
              Access Restricted
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account (<span className="font-mono font-medium text-foreground">{user.email}</span>) with role{' '}
              <span className="font-semibold text-foreground">{user.role}</span> is not authorized to access this workspace.
            </p>
            {userWorkspaces.length > 0 && (
              <div className="mt-3 rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground font-mono">
                Permitted Workspaces: <span className="font-bold text-foreground">{userWorkspaces.join(', ')}</span>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href={defaultDashboard} className="w-full sm:w-auto">
                <Button className="w-full">
                  Go to My Dashboard
                </Button>
              </Link>
              <Button variant="outline" onClick={() => logout()} className="w-full sm:w-auto gap-1.5 text-xs">
                <LogOut className="size-3.5" />
                <span>Log Out</span>
              </Button>
            </div>
          </div>
        </div>
      )
    }
  }

  return <>{children}</>
}
