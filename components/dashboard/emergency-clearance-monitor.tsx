'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Radio,
  Car,
  CheckCircle2,
  AlertCircle,
  Wifi,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react'
import { clearanceApi, type ClearanceSession, type ConnectedVehicleStatus } from '@/lib/api/clearance'
import { getSocket, subscribeEvent, REALTIME_EVENTS } from '@/lib/socket/client'

interface EmergencyClearanceMonitorProps {
  ambulanceId?: string
  className?: string
}

export function EmergencyClearanceMonitor({
  ambulanceId = 'AMB-01',
  className = ''
}: EmergencyClearanceMonitorProps) {
  const [session, setSession] = useState<ClearanceSession | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false)

  // Fetch active clearance session
  const fetchSession = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await clearanceApi.getForVehicle(ambulanceId)
      if (res && res.success && res.data) {
        setSession(res.data)
      }
    } catch {
      // Retain optimistic baseline
    } finally {
      setIsLoading(false)
    }
  }, [ambulanceId])

  useEffect(() => {
    fetchSession()
  }, [fetchSession])

  // Real-time socket sync with driver actions
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const unsub = subscribeEvent<any>(
      REALTIME_EVENTS.CLEARANCE_STATUS_UPDATED,
      (data) => {
        if (data && (!data.vehicleId || data.vehicleId === ambulanceId)) {
          setSession(data)
        }
      }
    )

    return () => unsub()
  }, [ambulanceId])

  const handleAdvance = async () => {
    setIsAdvancing(true)
    try {
      const res = await clearanceApi.advanceCycle(ambulanceId, 1)
      if (res && res.success && res.data) {
        setSession(res.data)
      }
    } catch {
      // Local progression fallback
      if (session) {
        const nextVehicles = session.connectedVehicles.map((v) => {
          if (v.status === 'DETECTED') return { ...v, status: 'ALERT_SENT' as const }
          if (v.status === 'ALERT_SENT') return { ...v, status: 'ACKNOWLEDGED' as const }
          if (v.status === 'ACKNOWLEDGED') return { ...v, status: 'GIVING_WAY' as const }
          if (v.status === 'GIVING_WAY') return { ...v, status: 'CLEARED' as const }
          return v
        })
        const clearedCount = nextVehicles.filter((v) => v.status === 'CLEARED').length
        setSession({
          ...session,
          connectedVehicles: nextVehicles,
          summary: {
            ...session.summary,
            totalCleared: clearedCount
          }
        })
      }
    } finally {
      setIsAdvancing(false)
    }
  }

  const getStatusBadge = (status: ConnectedVehicleStatus) => {
    switch (status) {
      case 'CLEARED':
        return {
          label: 'CLEARED PATH',
          bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          dot: 'bg-emerald-400'
        }
      case 'GIVING_WAY':
        return {
          label: 'GIVING WAY',
          bg: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
          dot: 'bg-teal-400 animate-pulse'
        }
      case 'ACKNOWLEDGED':
        return {
          label: 'ACKNOWLEDGED',
          bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          dot: 'bg-indigo-400'
        }
      case 'ALERT_SENT':
        return {
          label: 'ALERT SENT',
          bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          dot: 'bg-sky-400 animate-ping'
        }
      default:
        return {
          label: 'DETECTED',
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          dot: 'bg-amber-400'
        }
    }
  }

  const vehicles = session?.connectedVehicles || []
  const clearedCount = session?.summary?.totalCleared ?? vehicles.filter((v) => v.status === 'CLEARED').length
  const totalCount = vehicles.length || 3
  const percent = Math.round((clearedCount / totalCount) * 100)

  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-xs text-card-foreground ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <Radio className="size-4 animate-pulse" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">
                Corridor Emergency Clearance
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-teal-500/15 text-teal-400 border border-teal-500/30">
                SIMULATED CONNECTED VEHICLES (DEMO V2X)
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monitoring civilian vehicles giving way in the forward corridor for Unit {ambulanceId}.
          </p>
        </div>

        <button
          type="button"
          onClick={handleAdvance}
          disabled={isAdvancing}
          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-400 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          title="Advance clearance simulation step"
        >
          <RefreshCw className={`size-3.5 ${isAdvancing ? 'animate-spin' : ''}`} />
          <span>{isAdvancing ? 'Cycling...' : 'Advance V2X Step'}</span>
        </button>
      </div>

      {/* Corridor Progress */}
      <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground font-medium">Forward Lane Yield Status</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-teal-400 font-mono">{clearedCount} of {totalCount}</span>
            <span className="text-muted-foreground">Vehicles Cleared</span>
            <span className="text-[10px] font-bold text-teal-400 bg-teal-500/20 px-1.5 py-0.5 rounded">
              {percent}%
            </span>
          </div>
        </div>

        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Wifi className="size-3.5 text-teal-400 shrink-0" />
          <span className="font-mono truncate">
            Active Broadcast: &ldquo;AMBULANCE APPROACHING — PULL OVER TO LEFT SHOULDER&rdquo;
          </span>
        </div>
      </div>

      {/* Vehicle list */}
      <div className="mt-4 space-y-2">
        <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
          Connected Vehicles Ahead in Ambulance Corridor
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {vehicles.map((v, i) => {
            const badge = getStatusBadge(v.status)
            return (
              <div
                key={v.vehicleId || i}
                className="p-3 rounded-lg border border-border bg-card/60 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Car className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-bold font-mono text-foreground">{v.label}</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-cyan-400">
                    {v.distanceToAmbulanceMeters}m
                  </span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-extrabold border ${badge.bg}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                    {badge.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {v.status === 'CLEARED' ? 'Lane Open' : 'Yielding'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
