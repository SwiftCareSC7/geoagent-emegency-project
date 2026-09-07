'use client'

import { Ambulance, Loader2, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import React, { useEffect } from 'react'

import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'
import type { UserRole } from '@/lib/auth/types'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
}

/**
 * Route protection wrapper for authenticated pages.
 *
 * Prevents content flashing by rendering an accessible loading state while the
 * session is being verified against GET /api/auth/me.
 *
 * Redirects unauthenticated users to /login?redirect=<current_path>.
 */
export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading, authenticated } = useAuth()

  useEffect(() => {
    if (!loading && !authenticated) {
      const redirectQuery = pathname ? `?redirect=${encodeURIComponent(pathname)}` : ''
      router.replace(`/login${redirectQuery}`)
    }
  }, [loading, authenticated, router, pathname])

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

  // 2. Unauthenticated (effect will handle redirect, render placeholder to avoid flash)
  if (!authenticated || !user) {
    return null
  }

  // 3. Role authorization check (if specific roles are required)
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
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
            Your account (<span className="font-mono font-medium text-foreground">{user.email}</span>) has the role{' '}
            <span className="font-semibold text-foreground">{user.role}</span>, which is not authorized to view this screen.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full">
                Return to Home
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button className="w-full">
                Switch Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
