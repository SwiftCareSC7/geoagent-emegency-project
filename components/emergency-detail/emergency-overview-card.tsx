'use client'

import {
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Flame,
  HeartPulse,
  Hospital,
  MapPin,
  Navigation,
  Phone,
  Shield,
  Siren,
  Truck,
  User,
} from 'lucide-react'
import { useState } from 'react'
import type { Emergency, Vehicle } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface EmergencyOverviewCardProps {
  emergency: Emergency
  vehicle?: Vehicle | null
}

const priorityBadges: Record<
  string,
  { label: string; className: string; pulse?: boolean }
> = {
  CRITICAL: {
    label: 'Critical Priority',
    className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold',
    pulse: true,
  },
  HIGH: {
    label: 'High Priority',
    className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 font-semibold',
  },
  MEDIUM: {
    label: 'Medium Priority',
    className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  LOW: {
    label: 'Low Priority',
    className: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
  },
}

const statusBadges: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending Dispatch',
    className: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  },
  DISPATCHED: {
    label: 'Unit Dispatched',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  IN_PROGRESS: {
    label: 'En Route to Scene',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  AT_SCENE: {
    label: 'At Emergency Scene',
    className: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  },
  RESOLVED: {
    label: 'Mission Resolved',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
  },
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'CARDIAC':
    case 'MEDICAL':
      return <HeartPulse className="h-5 w-5 text-rose-500" />
    case 'TRAUMA':
    case 'ACCIDENT':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />
    case 'FIRE':
      return <Flame className="h-5 w-5 text-amber-500" />
    case 'POLICE':
      return <Shield className="h-5 w-5 text-blue-500" />
    default:
      return <Siren className="h-5 w-5 text-cyan-500" />
  }
}

function formatCoordinate(coord?: [number, number]): string {
  if (!coord || coord.length < 2) return 'N/A'
  const [lng, lat] = coord
  return `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`
}

function formatIsoTime(isoString?: string): string {
  if (!isoString) return 'N/A'
  try {
    const d = new Date(isoString)
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  } catch {
    return isoString
  }
}

export function EmergencyOverviewCard({ emergency, vehicle }: EmergencyOverviewCardProps) {
  const [copiedLocation, setCopiedLocation] = useState(false)
  const [copiedDest, setCopiedDest] = useState(false)

  const priorityMeta = priorityBadges[emergency.priority] || priorityBadges.LOW
  const statusMeta = statusBadges[emergency.status] || {
    label: emergency.status,
    className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  }

  const handleCopyCoord = (coord?: [number, number], isDest = false) => {
    if (!coord) return
    const text = `${coord[1]}, ${coord[0]}`
    navigator.clipboard.writeText(text)
    if (isDest) {
      setCopiedDest(true)
      setTimeout(() => setCopiedDest(false), 2000)
    } else {
      setCopiedLocation(true)
      setTimeout(() => setCopiedLocation(false), 2000)
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-6 shadow-sm">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 shadow-inner">
            {getTypeIcon(emergency.type)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {emergency.emergencyId}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                  priorityMeta.className,
                )}
              >
                {priorityMeta.pulse && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                  </span>
                )}
                {priorityMeta.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Incident Type:{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {emergency.type}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
              statusMeta.className,
            )}
          >
            {statusMeta.label}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-100/60 dark:bg-zinc-800/60 px-2.5 py-1 rounded-md border border-zinc-200/40 dark:border-zinc-700/40">
            <Clock className="h-3.5 w-3.5" />
            <span>Logged: {formatIsoTime(emergency.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Description */}
      {emergency.description && (
        <div className="py-4 border-b border-zinc-100 dark:border-zinc-800/80">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
            Dispatch Dispatcher Log / Call Summary
          </p>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
            {emergency.description}
          </p>
        </div>
      )}

      {/* Grid: Coordinates & Caller & Vehicle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-5">
        {/* Location Point */}
        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <MapPin className="h-4 w-4 text-rose-500" />
              <span>Scene Location</span>
            </div>
            <button
              onClick={() => handleCopyCoord(emergency.location?.coordinates, false)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded transition-colors"
              title="Copy GPS coordinates"
            >
              {copiedLocation ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {formatCoordinate(emergency.location?.coordinates)}
          </p>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            WGS84 EPSG:4326 [Lng: {emergency.location?.coordinates[0]?.toFixed(5)}, Lat:{' '}
            {emergency.location?.coordinates[1]?.toFixed(5)}]
          </p>
        </div>

        {/* Destination Hospital */}
        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <Hospital className="h-4 w-4 text-emerald-500" />
              <span>Destination Facility</span>
            </div>
            {emergency.destination && (
              <button
                onClick={() => handleCopyCoord(emergency.destination?.coordinates, true)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded transition-colors"
                title="Copy Destination GPS coordinates"
              >
                {copiedDest ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
          {emergency.destination ? (
            <>
              <p className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {formatCoordinate(emergency.destination.coordinates)}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Designated Trauma Care Facility
              </p>
            </>
          ) : (
            <p className="text-xs text-zinc-400 italic mt-1">
              Destination hospital not yet assigned
            </p>
          )}
        </div>

        {/* Assigned Vehicle / Caller */}
        <div className="rounded-xl border border-zinc-200/60 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
            <Truck className="h-4 w-4 text-cyan-500" />
            <span>Assigned Emergency Unit</span>
          </div>

          {vehicle ? (
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                  {vehicle.vehicleId}
                </span>
                <span className="text-[10px] font-mono uppercase bg-zinc-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                  {vehicle.status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1">
                Driver: <span className="font-medium">{vehicle.driverName}</span>
              </p>
              {vehicle.driverContact && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3" />
                  <span>{vehicle.driverContact}</span>
                </p>
              )}
            </div>
          ) : (
            <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>No vehicle currently dispatched</span>
            </div>
          )}

          {/* Caller Details Footer */}
          {emergency.callerName && (
            <div className="mt-2 pt-2 border-t border-zinc-200/40 dark:border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1 truncate">
                <User className="h-3 w-3" />
                {emergency.callerName}
              </span>
              {emergency.callerContact && (
                <span className="font-mono">{emergency.callerContact}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
