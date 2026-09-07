'use client'

import {
  AlertCircle,
  Ambulance,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Radio,
  ShieldAlert,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/types'
import { useAuth } from '@/lib/auth/context'

const inputClass =
  'w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50 disabled:cursor-not-allowed'

export function SignupForm() {
  const router = useRouter()
  const { signup, login } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string
    email?: string
    password?: string
  }>({})
  const [formError, setFormError] = useState<string | null>(null)
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
      errors.email = 'Please enter a valid email address'
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
      })

      setSuccessMessage(
        regResult.message || 'Account created successfully! Logging you in...',
      )

      // 2. Since backend registration does not auto-login, authenticate immediately
      try {
        await login({
          email: email.trim().toLowerCase(),
          password,
        })
        router.push('/driver/dashboard')
      } catch {
        // If auto-login fails, redirect to login page
        router.push('/login?registered=true')
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isConflict) {
          setFormError('An account with this email address already exists. Please log in.')
        } else if (err.isNetworkError) {
          setFormError('Unable to reach the server. Please verify the backend is running.')
        } else {
          setFormError(err.message)
        }
      } else if (err instanceof Error) {
        setFormError(err.message)
      } else {
        setFormError('An unexpected error occurred during registration. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Register to access the SwiftCare emergency response platform.
      </p>

      {/* Role notice banner */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
        <Radio className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Control Room Account:</span>{' '}
          Public registrations are assigned the <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">CONTROL_ROOM</code> role for authorized monitoring.
        </p>
      </div>

      {/* Success notification */}
      {successMessage && (
        <div
          role="status"
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p className="font-medium leading-snug">{successMessage}</p>
        </div>
      )}

      {/* Error notification */}
      {formError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p className="font-medium leading-snug">{formError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-foreground"
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
            placeholder="Ananya Rao"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              if (fieldErrors.name) {
                setFieldErrors((prev) => ({ ...prev, name: undefined }))
              }
            }}
            className={`${inputClass} ${fieldErrors.name ? 'border-destructive focus:border-destructive focus:ring-destructive/30' : ''}`}
          />
          {fieldErrors.name && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-foreground"
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
            placeholder="operator@geoagent.local"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErrors.email) {
                setFieldErrors((prev) => ({ ...prev, email: undefined }))
              }
            }}
            className={`${inputClass} ${fieldErrors.email ? 'border-destructive focus:border-destructive focus:ring-destructive/30' : ''}`}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Password
          </label>
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
              className={`${inputClass} pr-10 ${fieldErrors.password ? 'border-destructive focus:border-destructive focus:ring-destructive/30' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>

          {/* Password criteria checklist */}
          <div className="mt-2 space-y-1 text-xs">
            <p className="font-medium text-muted-foreground">Password requirements:</p>
            <div className="grid grid-cols-2 gap-1 text-muted-foreground">
              <span className={passwordCriteria.length ? 'text-emerald-500 font-medium' : ''}>
                • Min 8 characters
              </span>
              <span className={passwordCriteria.hasUpper ? 'text-emerald-500 font-medium' : ''}>
                • One uppercase
              </span>
              <span className={passwordCriteria.hasLower ? 'text-emerald-500 font-medium' : ''}>
                • One lowercase
              </span>
              <span className={passwordCriteria.hasNumber ? 'text-emerald-500 font-medium' : ''}>
                • One number
              </span>
            </div>
          </div>

          {fieldErrors.password && (
            <p className="mt-1.5 text-xs text-destructive">{fieldErrors.password}</p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full font-semibold"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already registered?{' '}
        <Link
          href="/login"
          className="font-semibold text-primary hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  )
}
