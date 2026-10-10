'use client'

import React from 'react'
import { Sparkles, ArrowRight, ShieldCheck, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DriverRerouteAlertProps {
  open: boolean
  timeSavedMinutes: number
  newEtaMinutes: number
  newDistanceKm: number
  bypassDescription?: string
  onAcceptReroute: () => void
  onDismiss: () => void
  className?: string
}

export function DriverRerouteAlert({
  open,
  timeSavedMinutes = 4,
  newEtaMinutes = 11,
  newDistanceKm = 4.2,
  bypassDescription = 'Bypass via arterial corridor avoids detected traffic bottleneck ahead.',
  onAcceptReroute,
  onDismiss,
  className = ''
}: DriverRerouteAlertProps) {
  if (!open) return null

  return (
    <div className={`fixed inset-x-3 sm:inset-x-auto sm:right-6 sm:bottom-28 bottom-24 z-50 max-w-md animate-in slide-in-from-bottom duration-300 ${className}`}>
      <div className="rounded-3xl border-2 border-emerald-400 bg-slate-900/98 p-5 shadow-2xl text-white backdrop-blur-2xl ring-4 ring-emerald-500/20">
        {/* Top Header Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
            <Sparkles className="size-3.5 animate-pulse" />
            <span>Faster Route Found</span>
          </div>

          <span className="text-xs font-mono font-bold text-emerald-400">
            SAVE ~{timeSavedMinutes} MIN
          </span>
        </div>

        {/* Core Value Proposition */}
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black font-mono text-white tracking-tight">
              {newEtaMinutes} min
            </span>
            <span className="text-slate-400 text-sm font-mono">
              · {newDistanceKm.toFixed(1)} km
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-300 leading-snug">
            {bypassDescription}
          </p>
        </div>

        {/* Action Buttons with Large Tap Targets (>= 44px) */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onDismiss}
            className="min-h-[46px] rounded-xl border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white active:scale-95 text-xs font-bold touch-manipulation"
          >
            <X className="size-4 mr-1.5" />
            Keep Current
          </Button>

          <Button
            type="button"
            onClick={onAcceptReroute}
            className="min-h-[46px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 text-xs font-black shadow-lg shadow-emerald-600/30 touch-manipulation flex items-center justify-center gap-1.5"
          >
            <Check className="size-4" />
            Follow New Route
          </Button>
        </div>
      </div>
    </div>
  )
}
