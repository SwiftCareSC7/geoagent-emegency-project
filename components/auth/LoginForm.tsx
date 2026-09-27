'use client'

import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  KeyRound,
  Loader2,
  Navigation,
  Shield,
  UserCheck
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/types'
import { useAuth } from '@/lib/auth/context'

/* ── Shared input styling ── */
const inputClass =
  'w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm text-foreground shadow-xs outline-hidden transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-muted/50 focus:ring-1 focus:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed'

/* ── Demo role config ── */
const DEMO_ROLES = [
  {
    label: 'Dispatcher',
    sub: 'Control Room',
    email: 'operator@swiftcare.local',
    pass: 'Operator123!',
    route: '/control-room',
    icon: Shield,
    color: 'emerald',
    borderHover: 'hover:border-emerald-500/40',
    iconColor: 'text-emerald-400',
  },
  {
    label: 'Driver',
    sub: 'Vehicle HUD',
    email: 'driver@swiftcare.local',
    pass: 'DriverPassword123!',
    route: '/driver/dashboard',
    icon: Navigation,
    color: 'cyan',
    borderHover: 'hover:border-cyan-500/40',
    iconColor: 'text-cyan-400',
  },
  {
    label: 'Admin',
    sub: 'Console',
    email: 'admin@swiftcare.local',
    pass: 'AdminPassword123!',
    route: '/admin',
    icon: UserCheck,
    color: 'amber',
    borderHover: 'hover:border-amber-500/40',
    iconColor: 'text-amber-400',
  },
  {
    label: 'Paramedic',
    sub: 'Triage',
    email: 'paramedic@swiftcare.local',
    pass: 'Paramedic123!',
    route: '/paramedic',
    icon: HeartPulse,
    color: 'rose',
    borderHover: 'hover:border-rose-500/40',
    iconColor: 'text-rose-400',
  },
] as const

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectParam = searchParams.get('redirect')

  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<{ what: string; howToFix: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address (e.g. operator@swiftcare.local)'
    }

    if (!password) {
      errors.password = 'Password is required'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLogin = async (targetEmail = email, targetPass = password, customRedirect?: string) => {
    setFormError(null)

    if (!targetEmail.trim() || !targetPass) {
      validate()
      return
    }

    setSubmitting(true)
    try {
      const userRes = await login({
        email: targetEmail.trim().toLowerCase(),
        password: targetPass,
      })

      // Route based on role if redirectParam wasn't explicitly set
      let targetRoute = redirectParam
      if (!targetRoute) {
        if (userRes?.role === 'CONTROL_ROOM') targetRoute = '/control-room'
        else if (userRes?.role === 'ADMIN') targetRoute = '/admin'
        else if (userRes?.role === 'PARAMEDIC') targetRoute = '/paramedic'
        else targetRoute = '/driver/dashboard'
      }

      router.push(customRedirect || targetRoute)
    } catch (err: unknown) {
      const status = (err as any)?.status
      const msg = ((err as any)?.message || '').toLowerCase()

      if (status === 401 || msg.includes('invalid email') || msg.includes('unauthorized') || (err as any)?.isUnauthorized) {
        setFormError({
          what: 'Invalid email or password combination.',
          howToFix: 'Double check for typos or use one of the demo roles above.'
        })
      } else if (status === 0 || msg.includes('network') || (err as any)?.isNetworkError) {
        setFormError({
          what: 'Backend API connection failed.',
          howToFix: 'Ensure the Express API server on port 5001 is active.'
        })
      } else {
        setFormError({
          what: (err as any)?.message || 'Authentication error occurred.',
          howToFix: 'Verify your credentials or contact system admin.'
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickLogin = (roleEmail: string, rolePass: string, destRoute: string) => {
    setEmail(roleEmail)
    setPassword(rolePass)
    handleLogin(roleEmail, rolePass, destRoute)
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
            Sign in
          </h1>
          <span className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 leading-none">
            SECURE
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Enter credentials or select a demo role below.
        </p>
      </div>

      {/* Error notification */}
      {formError && (
        <div
          role="alert"
          id="auth-error-alert"
          className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-xs space-y-0.5"
        >
          <div className="flex items-center gap-2 font-semibold text-rose-400">
            <AlertCircle className="size-3.5 shrink-0" />
            <span>{formError.what}</span>
          </div>
          <p className="pl-[22px] text-slate-400">
            {formError.howToFix}
          </p>
        </div>
      )}

      {/* Quick Demo Sign-In Grid */}
      <div className="rounded-xl border border-border bg-muted/20 p-3 mb-5">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
          <KeyRound className="size-3 text-muted-foreground" />
          <span>Demo Roles</span>
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {DEMO_ROLES.map((role) => {
            const Icon = role.icon
            return (
              <button
                key={role.label}
                type="button"
                onClick={() => handleQuickLogin(role.email, role.pass, role.route)}
                disabled={submitting}
                className={`group flex items-center gap-2 rounded-lg border border-border bg-card/50 px-2.5 py-2 text-left text-xs transition-all duration-200 ${role.borderHover} hover:bg-card disabled:opacity-40`}
              >
                <Icon className={`size-3.5 ${role.iconColor} shrink-0 transition-transform duration-200 group-hover:scale-110`} />
                <div className="min-w-0">
                  <div className="font-semibold text-foreground text-[13px] leading-tight">{role.label}</div>
                  <div className="text-[10px] text-muted-foreground/60 font-mono truncate">{role.sub}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/50">
            or sign in manually
          </span>
        </div>
      </div>

      {/* Manual Credentials Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={submitting}
            placeholder="operator@swiftcare.local"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }
            }}
            className={`${inputClass} ${fieldErrors.email ? '!border-rose-500/50' : ''}`}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-rose-400">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              disabled={submitting}
              placeholder="••••••••"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }
              }}
              className={`${inputClass} pr-10 ${fieldErrors.password ? '!border-rose-500/50' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-rose-400">{fieldErrors.password}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition-all duration-200 rounded-xl"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Authenticating…</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Need an account?{' '}
        <Link
          href="/signup"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Register
        </Link>
      </p>
    </div>
  )
}
