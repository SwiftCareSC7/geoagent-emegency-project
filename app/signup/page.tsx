'use client'

import {
  Ambulance,
  ArrowLeft,
  ArrowRight,
  Building2,
  Radio,
  ShieldCheck,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

type Role = 'driver' | 'operator'

export default function SignupPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('driver')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Prototype only: no data is stored, no password is persisted.
    router.push('/driver/dashboard')
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
            Create your prototype profile to explore real-time monitoring,
            delay prediction, and smart rerouting.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-primary-foreground/90">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4" /> Prototype UI — no real accounts
            </li>
            <li className="flex items-center gap-2">
              <Radio className="size-4" /> Driver & control-room roles
            </li>
          </ul>
        </div>

        <p className="text-xs text-primary-foreground/60">
          Demonstration interface only.
        </p>
      </aside>

      {/* Form column */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>

          <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Onboard as a driver or control-room operator.
          </p>

          {/* Prototype notice */}
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-warning" />
            <p>
              <span className="font-semibold">Prototype UI only.</span>{' '}
              Authentication is not implemented and passwords are never stored.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <Field id="fullName" label="Full name">
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                autoComplete="name"
                placeholder="Ananya Rao"
                className={inputClass}
              />
            </Field>

            <Field id="email" label="Email">
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="jane@swiftcare.example"
                className={inputClass}
              />
            </Field>

            <Field id="password" label="Password">
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className={inputClass}
              />
            </Field>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-foreground">
                Role
              </legend>
              <div className="grid grid-cols-2 gap-3">
                <RoleOption
                  active={role === 'driver'}
                  onClick={() => setRole('driver')}
                  icon={Ambulance}
                  label="Driver"
                />
                <RoleOption
                  active={role === 'operator'}
                  onClick={() => setRole('operator')}
                  icon={Radio}
                  label="Control-room operator"
                />
              </div>
            </fieldset>

            {role === 'driver' ? (
              <div className="grid gap-5 rounded-xl border border-border bg-secondary/40 p-4 sm:grid-cols-2">
                <Field id="ambulanceId" label="Ambulance ID">
                  <input
                    id="ambulanceId"
                    name="ambulanceId"
                    type="text"
                    defaultValue="AMB-01"
                    placeholder="AMB-01"
                    className={inputClass}
                  />
                </Field>
                <Field id="base" label="Assigned hospital / base">
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="base"
                      name="base"
                      type="text"
                      defaultValue="St. Mary General Hospital"
                      placeholder="St. Mary General Hospital"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </Field>
              </div>
            ) : null}

            <Button type="submit" size="lg" className="w-full">
              Continue
              <ArrowRight className="size-4" />
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
      </div>
    </main>
  )
}

const inputClass =
  'w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/30'

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function RoleOption({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-xl border p-3 text-left text-sm font-medium transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-foreground hover:bg-muted'
      }`}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </button>
  )
}
