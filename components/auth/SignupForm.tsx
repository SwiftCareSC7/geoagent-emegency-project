'use client'

import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Navigation,
  Shield,
  ShieldAlert,
  X
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/types'
import { useAuth } from '@/lib/auth/context'
import { BrandLogo } from '@/components/brand-logo'

/* Shared theme-aware input styling */
const inputClass =
  'w-full rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm text-foreground shadow-xs outline-hidden transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-muted/50 focus:ring-1 focus:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed'

export function SignupForm() {
  const router = useRouter()
  const { signup, login } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'CONTROL_ROOM' | 'DRIVER' | 'PARAMEDIC' | 'ADMIN'>('CONTROL_ROOM')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    password?: string
    confirmPassword?: string
    role?: string
  }>({})
  const [formError, setFormError] = useState<{ what: string; howToFix: string } | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Password criteria check
  const passwordCriteria = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  }
  const isPasswordValid =
    passwordCriteria.length &&
    passwordCriteria.hasUpper &&
    passwordCriteria.hasLower &&
    passwordCriteria.hasNumber

  const validate = (): boolean => {
    const errors: {
      name?: string
      email?: string
      password?: string
      confirmPassword?: string
      role?: string
    } = {}

    if (!name.trim()) {
      errors.name = 'Full name is required. Please enter your full name.'
    } else if (name.trim().length > 100) {
      errors.name = 'Full name must be 100 characters or fewer.'
    }

    if (!email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email format (e.g. operator@swiftcare.local).'
    }

    if (!password) {
      errors.password = 'Password is required.'
    } else if (!isPasswordValid) {
      errors.password =
        'Password must be at least 8 characters and include uppercase, lowercase, and a number.'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Confirm your password by entering it again.'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match. Please ensure both passwords are identical.'
    }

    if (!['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC', 'ADMIN'].includes(role)) {
      errors.role = 'Please select a valid operational role (Dispatcher, Driver, Paramedic, or Admin).'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSuccessMessage(null)

    if (!validate()) return

    setSubmitting(true)
    try {
      // 1. Register with backend
      const regResult = await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      })

      setSuccessMessage(
        regResult.message || 'Account created successfully! Initializing authenticated session...',
      )

      // 2. Establish authenticated session via login
      try {
        const loggedUser = await login({
          email: email.trim().toLowerCase(),
          password,
        })

        const destination =
          loggedUser.role === 'CONTROL_ROOM'
            ? '/control-room'
            : loggedUser.role === 'PARAMEDIC'
            ? '/paramedic'
            : loggedUser.role === 'ADMIN'
            ? '/admin'
            : '/driver/dashboard'

        router.push(destination)
      } catch {
        router.push('/login?registered=true')
      }
    } catch (err: unknown) {
      const status = (err as any)?.status
      const msg = ((err as any)?.message || '').toLowerCase()

      if (status === 409 || msg.includes('already registered') || (err as any)?.isConflict) {
        setFormError({
          what: 'This email is already registered in the system.',
          howToFix: 'Click "Sign in here" below to access your existing account, or use a different email address.'
        })
        setFieldErrors((prev) => ({
          ...prev,
          email: 'This email is already in use.'
        }))
      } else if (status === 403 || msg.includes('restricted') || (err as any)?.isForbidden) {
        setFormError({
          what: (err as any)?.message || 'Registration for this role is restricted.',
          howToFix: 'Select an authorized operational role or contact an administrator.'
        })
      } else if (status === 0 || msg.includes('network') || (err as any)?.isNetworkError) {
        setFormError({
          what: 'Unable to reach the SwiftCare authentication backend.',
          howToFix: 'Ensure the API service on port 5001 is running and reachable.'
        })
      } else {
        setFormError({
          what: (err as any)?.message || 'Registration error occurred.',
          howToFix: 'Please verify the highlighted fields and resubmit.'
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
            Create Account
          </h1>
          <span className="rounded-md bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary leading-none">
            PERSONNEL
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Register new personnel credentials for SwiftCare corridor operations.
        </p>
      </div>

      {/* Success notification */}
      {successMessage && (
        <div
          role="status"
          className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-300"
        >
          <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* Actionable Error notification */}
      {formError && (
        <div
          role="alert"
          id="signup-error-alert"
          className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-xs space-y-1"
        >
          <div className="flex items-center gap-2 font-semibold text-rose-500 dark:text-rose-400">
            <AlertCircle className="size-4 shrink-0" />
            <span>{formError.what}</span>
          </div>
          <p className="pl-6 text-muted-foreground">
            <span className="font-semibold text-foreground">Action:</span> {formError.howToFix}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Full Name */}
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            disabled={submitting}
            placeholder="Officer Vikram Singh"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (fieldErrors.name) {
                setFieldErrors((prev) => ({ ...prev, name: undefined }))
              }
            }}
            className={`${inputClass} ${fieldErrors.name ? '!border-rose-500/50' : ''}`}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{fieldErrors.name}</p>
          )}
        </div>

        {/* Email Address */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            disabled={submitting}
            placeholder="vikram@swiftcare.local"
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
            <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{fieldErrors.email}</p>
          )}
        </div>

        {/* Operational Role Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-muted-foreground">
              Operational Role
            </label>
            <span className="text-[10px] font-mono text-muted-foreground/70">Select deployment</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => {
                setRole('CONTROL_ROOM')
                if (fieldErrors.role) setFieldErrors((prev) => ({ ...prev, role: undefined }))
              }}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                role === 'CONTROL_ROOM'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 shadow-xs'
                  : 'border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              <Shield className="size-4 mb-1 text-emerald-500" />
              <span>Dispatcher</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('DRIVER')
                if (fieldErrors.role) setFieldErrors((prev) => ({ ...prev, role: undefined }))
              }}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                role === 'DRIVER'
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 shadow-xs'
                  : 'border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              <Navigation className="size-4 mb-1 text-cyan-500" />
              <span>Driver</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('PARAMEDIC')
                if (fieldErrors.role) setFieldErrors((prev) => ({ ...prev, role: undefined }))
              }}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                role === 'PARAMEDIC'
                  ? 'border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-300 shadow-xs'
                  : 'border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              <HeartPulse className="size-4 mb-1 text-rose-500" />
              <span>Paramedic</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setRole('ADMIN')
                if (fieldErrors.role) setFieldErrors((prev) => ({ ...prev, role: undefined }))
              }}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                role === 'ADMIN'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-300 shadow-xs'
                  : 'border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              <ShieldAlert className="size-4 mb-1 text-amber-500" />
              <span>Admin</span>
            </button>
          </div>
          {fieldErrors.role && (
            <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{fieldErrors.role}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-muted-foreground"
            >
              Password
            </label>
            <span className="text-[10px] font-mono text-muted-foreground/70">Min 8 chars</span>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {/* Password criteria indicator badges */}
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-mono">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                passwordCriteria.length
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-muted/40 text-muted-foreground/70 border border-border'
              }`}
            >
              {passwordCriteria.length ? <Check className="size-3" /> : <X className="size-3" />}
              8+ chars
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                passwordCriteria.hasUpper
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-muted/40 text-muted-foreground/70 border border-border'
              }`}
            >
              {passwordCriteria.hasUpper ? <Check className="size-3" /> : <X className="size-3" />}
              Uppercase (A-Z)
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                passwordCriteria.hasLower
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-muted/40 text-muted-foreground/70 border border-border'
              }`}
            >
              {passwordCriteria.hasLower ? <Check className="size-3" /> : <X className="size-3" />}
              Lowercase (a-z)
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 ${
                passwordCriteria.hasNumber
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-muted/40 text-muted-foreground/70 border border-border'
              }`}
            >
              {passwordCriteria.hasNumber ? <Check className="size-3" /> : <X className="size-3" />}
              Number (0-9)
            </span>
          </div>

          {fieldErrors.password && (
            <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{fieldErrors.password}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-xs font-medium text-muted-foreground"
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              disabled={submitting}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                if (fieldErrors.confirmPassword) {
                  setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }))
                }
              }}
              className={`${inputClass} pr-10 ${fieldErrors.confirmPassword ? '!border-rose-500/50' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-xs text-rose-500 dark:text-rose-400">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 transition-all duration-200 rounded-xl cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Creating Profile...</span>
            </>
          ) : (
            <>
              <span>Complete Registration</span>
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Sign in here
        </Link>
      </p>
    </div>
  )
}
