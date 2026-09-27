'use client'

import { Loader2 } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { Suspense, useEffect } from 'react'

import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/lib/auth/context'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggleCompact } from '@/components/theme-toggle'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/driver/dashboard'
  const { authenticated, loading } = useAuth()

  useEffect(() => {
    if (!loading && authenticated) {
      router.replace(redirectPath)
    }
  }, [authenticated, loading, redirectPath, router])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="relative flex min-h-svh w-full overflow-hidden bg-background">
      {/* ── Left Hero Panel ── */}
      <div className="relative hidden lg:flex lg:w-[52%] flex-col justify-between p-10 xl:p-14 overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background dark:from-[#0a1628] dark:via-[#091220] dark:to-[#060a13]" />

        {/* Animated radial glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, rgba(2,132,199,0.12) 40%, transparent 70%)',
            animation: 'loginPulseGlow 8s ease-in-out infinite',
          }}
        />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
          }}
        />

        {/* Decorative ring */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full border border-emerald-500/10"
          style={{ animation: 'loginRingRotate 30s linear infinite' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full border border-cyan-500/8"
          style={{ animation: 'loginRingRotate 24s linear infinite reverse' }}
        />

        {/* Top: Logo */}
        <div className="relative z-10">
          <BrandLogo height={34} fallbackClassName="font-display text-lg font-bold text-foreground" priority />
        </div>

        {/* Center: Hero text */}
        <div className="relative z-10 max-w-lg" style={{ animation: 'loginFadeUp 0.8s ease-out both 0.2s' }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 mb-6">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tracking-wide">SYSTEM ONLINE</span>
          </div>

          <h1 className="font-display text-4xl xl:text-5xl font-extrabold text-slate-900 dark:text-white leading-[1.1] tracking-tight">
            Every second<br />
            <span className="bg-gradient-to-r from-emerald-500 to-cyan-500 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent">
              matters.
            </span>
          </h1>

          <p className="mt-5 text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
            SwiftCare GeoAgent monitors live conditions, predicts delays,
            and routes ambulances on the fastest verified path.
          </p>

          {/* Stats row */}
          <div className="mt-8 flex gap-8">
            {[
              { value: '<4min', label: 'Avg. Response' },
              { value: '99.7%', label: 'Uptime' },
              { value: '24/7', label: 'Dispatch' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-xl font-bold text-slate-900 dark:text-white font-display">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: legal */}
        <div className="relative z-10">
          <p className="text-[11px] text-slate-500 dark:text-slate-600">
            © {new Date().getFullYear()} SwiftCare Ambulance Services · Bengaluru, Karnataka
          </p>
        </div>
      </div>

      {/* ── Vertical Divider ── */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-border to-transparent" />

      {/* ── Right Form Panel ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 sm:p-8 lg:p-12">
        {/* Top-Right Theme Toggle */}
        <div className="absolute top-4 right-4 z-20">
          <ThemeToggleCompact />
        </div>

        {/* Mobile-only background glow */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 60%)',
          }}
        />

        {/* Mobile-only logo */}
        <div className="relative z-10 mb-8 lg:hidden">
          <BrandLogo height={30} fallbackClassName="font-display text-base font-bold text-foreground" />
        </div>

        <div className="relative z-10 w-full max-w-[420px]" style={{ animation: 'loginFadeUp 0.6s ease-out both 0.1s' }}>
          <LoginForm />
        </div>

        {/* Mobile-only copyright */}
        <p className="relative z-10 mt-8 text-[11px] text-slate-500 dark:text-slate-600 lg:hidden">
          © {new Date().getFullYear()} SwiftCare Ambulance Services
        </p>
      </div>

      {/* Keyframe animations */}
      <style jsx>{`
        @keyframes loginPulseGlow {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.2; }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.3; }
        }
        @keyframes loginRingRotate {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
