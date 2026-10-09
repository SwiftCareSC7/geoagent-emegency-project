'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Shield,
  KeyRound,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  CheckCircle2,
  Ambulance,
  Radio,
  Stethoscope,
  Lock
} from 'lucide-react'

import { useAuth } from '@/lib/auth/context'
import { getRoleDashboard, isRouteAllowedForUser } from '@/lib/auth/roles'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggleCompact } from '@/components/theme-toggle'

const DEMO_PRESETS = [
  {
    role: 'CONTROL_ROOM',
    label: 'Control Room Dispatcher',
    email: 'operator@swiftcare.local',
    pass: 'Operator123!',
    icon: Radio,
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
  },
  {
    role: 'DRIVER',
    label: 'Ambulance Driver (AMB-01)',
    email: 'driver@swiftcare.local',
    pass: 'DriverPassword123!',
    icon: Ambulance,
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20'
  },
  {
    role: 'PARAMEDIC',
    label: 'Field Paramedic Officer',
    email: 'paramedic@swiftcare.local',
    pass: 'Paramedic123!',
    icon: Stethoscope,
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20'
  },
  {
    role: 'ADMIN',
    label: 'Systems Administrator',
    email: 'admin@swiftcare.local',
    pass: 'AdminPassword123!',
    icon: Shield,
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  }
]

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect')

  const { login, loading: authLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPendingNotice, setIsPendingNotice] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMessage('Please enter both your email and password.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setIsPendingNotice(false)

    try {
      const user = await login({ email, password })
      const defaultDashboard = getRoleDashboard(user.role)
      const target = redirectTarget && isRouteAllowedForUser(user, redirectTarget)
        ? redirectTarget
        : defaultDashboard
      router.push(target)
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please verify your credentials.'
      setErrorMessage(msg)
      if (msg.toLowerCase().includes('pending') || msg.toLowerCase().includes('approval')) {
        setIsPendingNotice(true)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const applyPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail)
    setPassword(presetPass)
    setErrorMessage(null)
    setIsPendingNotice(false)
  }

  return (
    <div className="min-h-svh flex flex-col justify-between bg-background text-foreground">
      {/* Top Bar */}
      <header className="border-b border-border/60 bg-card/40 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo height={26} fallbackClassName="font-display text-sm font-bold tracking-tight text-foreground" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              AUTH SERVICE ONLINE
            </span>
            <ThemeToggleCompact />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md space-y-6">
          {/* Card Container */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl backdrop-blur-sm sm:p-8">
            <div className="space-y-2 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Lock className="size-6" />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-card-foreground">
                SwiftCare Sign In
              </h1>
              <p className="text-xs text-muted-foreground">
                Authoritative portal access for emergency services and operations personnel.
              </p>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div
                className={`mt-6 rounded-xl border p-3.5 text-xs ${
                  isPendingNotice
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    : 'border-destructive/30 bg-destructive/10 text-destructive dark:text-rose-400'
                }`}
                role="alert"
              >
                <div className="flex items-start gap-2.5">
                  {isPendingNotice ? (
                    <Clock className="size-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-semibold">{isPendingNotice ? 'Approval Pending' : 'Authentication Error'}</p>
                    <p className="leading-relaxed">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between" htmlFor="email">
                  <span>Work Email</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <Mail className="size-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@swiftcare.local"
                    className="w-full rounded-xl border border-input bg-background/80 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center justify-between" htmlFor="password">
                  <span>Password</span>
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <KeyRound className="size-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-xl border border-input bg-background/80 py-2.5 pl-9 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || authLoading}
                className="w-full mt-2 font-semibold flex items-center justify-center gap-2 py-2.5"
              >
                <span>{submitting ? 'Verifying Credentials...' : 'Authenticate & Enter'}</span>
                <ArrowRight className="size-4" />
              </Button>
            </form>

            {/* Quick-Fill Presets for Evaluation */}
            <div className="mt-8 border-t border-border/60 pt-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  One-Click Operational Roles
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">Demo Accounts</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_PRESETS.map((preset) => {
                  const Icon = preset.icon
                  const isSelected = email === preset.email
                  return (
                    <button
                      key={preset.role}
                      type="button"
                      onClick={() => applyPreset(preset.email, preset.pass)}
                      className={`flex flex-col text-left p-2.5 rounded-xl border text-xs transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-xs'
                          : 'border-border/60 bg-muted/40 hover:bg-muted hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`p-1 rounded-md border ${preset.color}`}>
                          <Icon className="size-3" />
                        </div>
                        <span className="font-semibold text-foreground truncate text-[11px]">
                          {preset.label.split(' ')[0]}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono truncate">
                        {preset.role}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Link to Registration */}
            <div className="mt-6 text-center text-xs text-muted-foreground">
              Don&apos;t have an operational account?{' '}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                Register New Personnel
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground font-mono">
        SwiftCare GeoAgent System — Authoritative Access Gated by Role-Based Access Control
      </footer>
    </div>
  )
}
