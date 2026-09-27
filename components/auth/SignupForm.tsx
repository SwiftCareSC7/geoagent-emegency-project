'use client'

import {
  AlertCircle,
  Ambulance,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartPulse,
  Loader2,
  Navigation,
  Radio,
  Shield,
  ShieldAlert,
  UserCheck
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/types'
import { useAuth } from '@/lib/auth/context'
import { BrandLogo } from '@/components/brand-logo'

const inputClass =
  'w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-white shadow-xs outline-hidden transition-colors placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed'

export function SignupForm() {
  const router = useRouter()
  const { signup, login } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'CONTROL_ROOM' | 'DRIVER' | 'PARAMEDIC'>('CONTROL_ROOM')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    password?: string
  }>({})
  const [formError, setFormError] = useState<{ what: string; howToFix: string } | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Backend password rule: min 8 characters, at least 1 uppercase, 1 lowercase, 1 number
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
    const errors: { name?: string; email?: string; password?: string } = {}

    if (!name.trim()) {
      errors.name = 'Full name is required'
    } else if (name.trim().length > 100) {
      errors.name = 'Name must be 100 characters or fewer'
    }

    if (!email.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address (e.g. operator@swiftcare.local)'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (!isPasswordValid) {
      errors.password =
        'Password must be at least 8 characters and include uppercase, lowercase, and a number'
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
        regResult.message || 'Account created successfully! Authenticating session...',
      )

      // 2. Since backend registration does not auto-login, authenticate immediately
      try {
        await login({
          email: email.trim().toLowerCase(),
          password,
        })
        if (role === 'CONTROL_ROOM') router.push('/control-room')
        else if (role === 'PARAMEDIC') router.push('/paramedic')
        else router.push('/driver/dashboard')
      } catch {
        router.push('/login?registered=true')
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isConflict) {
          setFormError({
            what: 'An account with this email address already exists.',
            howToFix: 'Click "Sign In" below or use a different email address.'
          })
        } else if (err.isNetworkError) {
          setFormError({
            what: 'Cannot connect to backend server.',
            howToFix: 'Verify the Express backend is running on port 5001.'
          })
        } else {
          setFormError({
            what: err.message,
            howToFix: 'Please check your inputs and try again.'
          })
        }
      } else if (err instanceof Error) {
        setFormError({
          what: err.message,
          howToFix: 'Review the details provided.'
        })
      } else {
        setFormError({
          what: 'An unexpected error occurred during registration.',
          howToFix: 'Refresh the page and try again.'
        })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <Link href="/" className="flex items-center">
            <BrandLogo height={28} fallbackClassName="font-display text-base font-bold text-white" />
          </Link>
          <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-400">
            OPERATOR REGISTRATION
          </span>
        </div>

        <h1 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
          Create Account
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Register credentials to access the SwiftCare corridor operations platform.
        </p>

        {/* Success notification */}
        {successMessage && (
          <div
            role="status"
            className="mt-4 flex items-center gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-300"
          >
            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
            <p className="font-medium">{successMessage}</p>
          </div>
        )}

        {/* Error notification */}
        {formError && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 space-y-1"
          >
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>{formError.what}</span>
            </div>
            <p className="pl-6 text-slate-300">
              <strong>Action:</strong> {formError.howToFix}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {/* Name Field */}
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-xs font-semibold text-slate-300"
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
              placeholder="e.g. Officer Vikram Singh"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: undefined }))
                }
              }}
              className={`${inputClass} ${fieldErrors.name ? 'border-rose-500' : ''}`}
            />
            {fieldErrors.name && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.name}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-xs font-semibold text-slate-300"
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
              placeholder="e.g. vikram@swiftcare.local"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (fieldErrors.email) {
                  setFieldErrors((prev) => ({ ...prev, email: undefined }))
                }
              }}
              className={`${inputClass} ${fieldErrors.email ? 'border-rose-500' : ''}`}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-xs text-rose-400">{fieldErrors.email}</p>
            )}
          </div>

          {/* Role Selection */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Operational Role
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRole('CONTROL_ROOM')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  role === 'CONTROL_ROOM'
                    ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="size-4 mb-1 text-emerald-400" />
                <span>Dispatcher</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('DRIVER')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  role === 'DRIVER'
                    ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Navigation className="size-4 mb-1 text-cyan-400" />
                <span>Driver</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('PARAMEDIC')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-bold transition-all ${
                  role === 'PARAMEDIC'
                    ? 'border-rose-500 bg-rose-500/15 text-rose-300'
                    : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <HeartPulse className="size-4 mb-1 text-rose-400" />
                <span>Paramedic</span>
              </button>
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-300"
              >
                Password
              </label>
              <span className="text-[10px] font-mono text-slate-400">Min 8 chars (A-Z, a-z, 0-9)</span>
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
                className={`${inputClass} pr-10 ${fieldErrors.password ? 'border-rose-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
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
            className="w-full font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 transition-colors"
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

        <p className="mt-6 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-indigo-400 hover:underline"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  )
}
