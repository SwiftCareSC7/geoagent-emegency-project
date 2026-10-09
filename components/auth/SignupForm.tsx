'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Shield,
  KeyRound,
  Mail,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
  CheckCircle2,
  Ambulance,
  Radio,
  Stethoscope,
  Lock,
  Car
} from 'lucide-react'

import { useAuth } from '@/lib/auth/context'
import type { UserRole, Workspace } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggleCompact } from '@/components/theme-toggle'

const AVAILABLE_ROLES: {
  role: UserRole
  name: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    role: 'CONTROL_ROOM',
    name: 'Control',
    label: 'Control Room Dispatcher',
    description: 'Emergency corridor surveillance, triage routing and dispatch operations',
    icon: Radio
  },
  {
    role: 'DRIVER',
    name: 'Ambulance',
    label: 'Ambulance Driver',
    description: 'Field emergency vehicle navigation HUD and active route guidance',
    icon: Ambulance
  },
  {
    role: 'PARAMEDIC',
    name: 'Field',
    label: 'Field Paramedic Officer',
    description: 'Patient vital signs, trauma logging, and hospital handoff readiness',
    icon: Stethoscope
  }
]

const AVAILABLE_WORKSPACES: {
  workspace: Workspace
  label: string
  description: string
}[] = [
  {
    workspace: 'CONTROL_ROOM',
    label: 'Control Room Dispatch',
    description: 'Corridor surveillance & emergency dispatch'
  },
  {
    workspace: 'DRIVER',
    label: 'Driver Navigation',
    description: 'Emergency vehicle HUD & routing'
  },
  {
    workspace: 'PARAMEDIC',
    label: 'Paramedic Triage',
    description: 'Clinical vitals & hospital triage handoff'
  }
]

export function SignupForm() {
  const { signup } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole>('CONTROL_ROOM')
  const [requestedWorkspaces, setRequestedWorkspaces] = useState<Workspace[]>(['CONTROL_ROOM'])
  const [assignedVehicleId, setAssignedVehicleId] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [registeredSuccess, setRegisteredSuccess] = useState<any | null>(null)

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    if (!requestedWorkspaces.includes(role)) {
      setRequestedWorkspaces((prev) => [...prev, role])
    }
  }

  const toggleWorkspace = (ws: Workspace) => {
    setRequestedWorkspaces((prev) => {
      if (prev.includes(ws)) {
        if (prev.length <= 1) return prev // keep at least 1 workspace
        return prev.filter((w) => w !== ws)
      } else {
        return [...prev, ws]
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setErrorMessage('Full name is required.')
      return
    }
    if (!email.trim()) {
      setErrorMessage('Work email is required.')
      return
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    try {
      const result = await signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role: selectedRole,
        requestedRole: selectedRole,
        requestedWorkspaces,
        assignedVehicleId: (selectedRole === 'DRIVER' || requestedWorkspaces.includes('DRIVER'))
          ? (assignedVehicleId.trim() || undefined)
          : undefined
      })
      setRegisteredSuccess(result.user)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration failed. Please check your information.')
    } finally {
      setSubmitting(false)
    }
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
              REGISTRATION DESK ACTIVE
            </span>
            <ThemeToggleCompact />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg space-y-6">
          {registeredSuccess ? (
            /* Successful Registration Screen */
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl backdrop-blur-sm sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
                <Clock className="size-7 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h1 className="font-display text-2xl font-bold tracking-tight text-card-foreground">
                  Registration Submitted
                </h1>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Your registration request has been securely recorded and is now pending administrator review.
                </p>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60 font-mono">
                  <span className="text-muted-foreground">Account Status</span>
                  <span className="font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                    PENDING APPROVAL
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Officer Name:</span>
                  <span className="font-semibold text-foreground">{registeredSuccess.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono text-foreground">{registeredSuccess.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Requested Role:</span>
                  <span className="font-semibold text-primary">{registeredSuccess.requestedRole || registeredSuccess.role}</span>
                </div>
                {registeredSuccess.requestedWorkspaces && registeredSuccess.requestedWorkspaces.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Requested Workspaces:</span>
                    <span className="font-mono text-foreground">{registeredSuccess.requestedWorkspaces.join(', ')}</span>
                  </div>
                )}
                {registeredSuccess.assignedVehicleId && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Assigned Vehicle:</span>
                    <span className="font-mono text-foreground">{registeredSuccess.assignedVehicleId}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-muted/40 rounded-xl border border-border text-[11px] text-muted-foreground leading-relaxed">
                🛡️ <strong className="text-foreground">Security Notice:</strong> In compliance with emergency dispatch protocols, all newly registered accounts (including administrative requests) remain in PENDING status and must be approved by an administrator before signing in.
              </div>

              <div className="pt-2">
                <Link href="/login">
                  <Button className="w-full gap-2">
                    <span>Return to Sign In</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <div className="rounded-2xl border border-border bg-card p-6 shadow-xl backdrop-blur-sm sm:p-8">
              <div className="space-y-2 text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Shield className="size-6" />
                </div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-card-foreground">
                  Personnel Registration
                </h1>
                <p className="text-xs text-muted-foreground">
                  Register for an operational field account. All accounts require administrator verification.
                </p>
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive dark:text-rose-400" role="alert">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Registration Issue</p>
                      <p className="leading-relaxed mt-0.5">{errorMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="name">
                    Full Name & Title
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                      <User className="size-4" />
                    </div>
                    <input
                      id="name"
                      autoComplete="name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Officer Rajesh Kumar"
                      className="w-full rounded-xl border border-input bg-background/80 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground" htmlFor="email">
                    Work Email Address
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
                      placeholder="rajesh@swiftcare.local"
                      className="w-full rounded-xl border border-input bg-background/80 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Primary Operational Role Requested
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {AVAILABLE_ROLES.map((r) => {
                      const Icon = r.icon
                      const isSelected = selectedRole === r.role
                      return (
                        <button
                          key={r.role}
                          type="button"
                          onClick={() => handleRoleSelect(r.role)}
                          className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30'
                              : 'border-border/60 bg-muted/40 hover:bg-muted hover:border-border'
                          }`}
                        >
                          <Icon className={`size-5 mb-1.5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="font-semibold text-xs text-foreground">{r.name}</span>
                          <span className="text-[10px] text-foreground/80 mt-0.5 line-clamp-1">{r.role}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Requested Workspaces (Multi-Workspace Access Support) */}
                <div className="space-y-2 rounded-xl border border-border/70 bg-muted/30 p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      Requested Operational Workspaces
                    </label>
                    <span className="text-[10px] font-mono text-muted-foreground">Multi-Select</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {AVAILABLE_WORKSPACES.map((w) => {
                      const isChecked = requestedWorkspaces.includes(w.workspace)
                      return (
                        <label
                          key={w.workspace}
                          onClick={() => toggleWorkspace(w.workspace)}
                          className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                            isChecked
                              ? 'border-primary/50 bg-primary/5 text-foreground'
                              : 'border-border/40 bg-card/60 text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleWorkspace(w.workspace)}
                            className="size-3.5 rounded border-border text-primary focus:ring-primary pointer-events-none"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-semibold text-foreground block">{w.label}</span>
                            <span className="text-[10px] text-foreground/80 block leading-tight">{w.description}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Workspaces define the authorized dashboards available upon login. Administrators review and approve assigned workspaces.
                  </p>
                </div>

                {/* Optional Vehicle ID for Drivers */}
                {(selectedRole === 'DRIVER' || requestedWorkspaces.includes('DRIVER')) && (
                  <div className="space-y-1.5 animate-in fade-in duration-150">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between" htmlFor="vehicleId">
                      <span>Assigned Vehicle Identifier</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <Car className="size-4" />
                      </div>
                      <input
                        id="vehicleId"
                        type="text"
                        value={assignedVehicleId}
                        onChange={(e) => setAssignedVehicleId(e.target.value)}
                        placeholder="AMB-01"
                        className="w-full rounded-xl border border-input bg-background/80 py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono uppercase"
                      />
                    </div>
                  </div>
                )}

                {/* Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground" htmlFor="password">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 8 chars"
                        className="w-full rounded-xl border border-input bg-background/80 py-2.5 px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground" htmlFor="confirmPassword">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full rounded-xl border border-input bg-background/80 py-2.5 px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-muted/40 p-3 border border-border text-[11px] text-muted-foreground">
                  🔒 <strong className="text-foreground">Policy:</strong> New accounts remain in <strong>PENDING</strong> status until approved by an administrator. Administrative and operational accounts are activated upon verification.
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full font-semibold flex items-center justify-center gap-2 py-2.5"
                >
                  <span>{submitting ? 'Submitting Registration...' : 'Submit for Administrator Approval'}</span>
                  <ArrowRight className="size-4" />
                </Button>
              </form>

              <div className="mt-6 text-center text-xs text-muted-foreground">
                Already have an approved account?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Sign In Here
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground font-mono">
        SwiftCare GeoAgent System — Protected Access Gate
      </footer>
    </div>
  )
}
