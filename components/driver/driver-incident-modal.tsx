'use client'

import React, { useState } from 'react'
import {
  AlertTriangle,
  Car,
  Ban,
  TrafficCone,
  Wrench,
  HelpCircle,
  X,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { incidentApi } from '@/lib/api/incidents'
import type { CreateIncidentPayload, IncidentType } from '@/lib/api/types'

interface DriverIncidentModalProps {
  open: boolean
  onClose: () => void
  currentCoordinates: [number, number] // [lng, lat]
  onIncidentReported?: (incident: any) => void
}

interface IncidentOption {
  type: IncidentType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const INCIDENT_OPTIONS: IncidentOption[] = [
  {
    type: 'ACCIDENT',
    label: 'Accident Ahead',
    description: 'Vehicle collision or road crash obstructing travel lanes',
    icon: Car,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/30'
  },
  {
    type: 'ROAD_CLOSURE',
    label: 'Road Blocked / Closed',
    description: 'Construction, police barricade, or unpassable road surface',
    icon: Ban,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  },
  {
    type: 'TRAFFIC_JAM',
    label: 'Heavy Congestion',
    description: 'Standstill traffic or severe bottleneck causing standstill delays',
    icon: TrafficCone,
    color: 'text-orange-400 bg-orange-500/10 border-orange-500/30'
  },
  {
    type: 'OTHER',
    label: 'Vehicle Issue',
    description: 'Ambulance mechanical fault, flat tire, or equipment problem',
    icon: Wrench,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  },
  {
    type: 'OTHER',
    label: 'Other Hazard',
    description: 'Flooding, downed power lines, or civic disruption',
    icon: HelpCircle,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30'
  }
];

export function DriverIncidentModal({
  open,
  onClose,
  currentCoordinates,
  onIncidentReported
}: DriverIncidentModalProps) {
  const [selectedType, setSelectedType] = useState<IncidentType>('ACCIDENT')
  const [selectedLabel, setSelectedLabel] = useState<string>('Accident Ahead')
  const [notes, setNotes] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const payload: CreateIncidentPayload = {
        type: selectedType,
        severity: selectedType === 'ACCIDENT' || selectedType === 'ROAD_CLOSURE' ? 'CRITICAL' : 'HIGH',
        description: `[Driver Report] ${selectedLabel}: ${notes.trim() || 'Reported from mobile driver dashboard'}`,
        location: {
          type: 'Point',
          coordinates: currentCoordinates
        },
        source: 'PUBLIC_REPORT'
      }

      const res = await incidentApi.create(payload)

      if (res.data) {
        setIsSuccess(true)
        if (onIncidentReported) onIncidentReported(res.data)
        setTimeout(() => {
          setIsSuccess(false)
          setNotes('')
          onClose()
        }, 1200)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit incident report to server')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Report Road Hazard to Control Room"
      description="Select hazard category to notify dispatch and trigger reroute assessment."
      className="max-w-md bg-slate-900 text-white border-slate-800"
    >
      {isSuccess ? (
        <div className="py-8 text-center space-y-3">
          <div className="flex size-14 mx-auto items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="size-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Hazard Reported</h3>
          <p className="text-xs text-slate-400">
            Control Room and surrounding emergency units have been notified in real time.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
              {errorMessage}
            </div>
          )}

          {/* Quick Selection Buttons */}
          <div className="space-y-2">
            {INCIDENT_OPTIONS.map((opt, idx) => {
              const isSelected = selectedLabel === opt.label
              const Icon = opt.icon
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedType(opt.type)
                    setSelectedLabel(opt.label)
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all min-h-[44px] touch-manipulation ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500'
                      : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/60'
                  }`}
                >
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg border ${opt.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs sm:text-sm text-slate-100">{opt.label}</div>
                    <div className="text-[11px] text-slate-400 truncate">{opt.description}</div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Additional Notes input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Optional Details / Landmarks:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Near Sony World junction, lane blocked"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none min-h-[44px]"
            />
          </div>

          {/* Coordinates readout */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Location:</span>
            <span className="font-mono">
              {currentCoordinates[1].toFixed(5)}°N, {currentCoordinates[0].toFixed(5)}°E
            </span>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-4 animate-spin" />
                  Submitting...
                </span>
              ) : (
                <span>Submit Report to Dispatch</span>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
