'use client'

import {
  Activity,
  Ambulance,
  ArrowLeft,
  Loader2,
  Radio,
  ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { Suspense, useEffect } from 'react'

import { SignupForm } from '@/components/auth/SignupForm'
import { useAuth } from '@/lib/auth/context'

function SignupContent() {
  const router = useRouter()
  const { authenticated, loading } = useAuth()

  useEffect(() => {
    if (!loading && authenticated) {
      router.replace('/driver/dashboard')
    }
  }, [authenticated, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      {/* Brand / info column */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-display text-lg font-bold"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
            <Ambulance className="size-5" />
          </span>
          SwiftCare GeoAgent
        </Link>

        <div>
          <h2 className="font-display text-3xl font-bold leading-tight text-balance">
            Get every crew to the scene faster.
          </h2>
          <p className="mt-4 max-w-sm text-pretty leading-relaxed text-primary-foreground/80">
            Join the SwiftCare GeoAgentic emergency movement system for real-time corridor monitoring, AI situation reasoning, and priority clearance.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/90">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Secure JWT & HTTP-only cookie authentication
            </li>
            <li className="flex items-center gap-2">
              <Radio className="size-4" /> Real-time telemetry & corridor green-wave clearance
            </li>
            <li className="flex items-center gap-2">
              <Activity className="size-4" /> Sub-second trajectory deviation detection
            </li>
          </ul>
        </div>

        <p className="text-xs text-primary-foreground/60">
          SwiftCare Emergency Response Platform · Production Tier
        </p>
      </aside>

      {/* Form column */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>

          <SignupForm />
        </div>
      </div>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  )
}
