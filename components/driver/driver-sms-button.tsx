'use client'

import React, { useState, useEffect } from 'react'
import {
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  X,
  Radio
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export type SmsStatusState = 'READY' | 'SENDING' | 'SUBMITTED' | 'DELIVERED' | 'FAILED' | 'UNKNOWN'

interface DriverSmsButtonProps {
  emergencyId?: string
  ambulanceId?: string
  defaultCallerContact?: string
  destinationHospital?: string
  etaMinutes?: number
  className?: string
  onStatusChange?: (status: SmsStatusState, message?: string) => void
}

export function DriverSmsButton({
  emergencyId = 'EMG-0001',
  ambulanceId = 'AMB-01',
  defaultCallerContact = '9876543210',
  destinationHospital = 'Tertiary Trauma Center',
  etaMinutes = 8,
  className = '',
  onStatusChange
}: DriverSmsButtonProps) {
  const [status, setStatus] = useState<SmsStatusState>('READY')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successInfo, setSuccessInfo] = useState<{ recipient?: string; provider?: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [customMobile, setCustomMobile] = useState('')

  // Fetch initial status if emergencyId is provided
  useEffect(() => {
    if (!emergencyId) return

    let isMounted = true
    async function fetchCurrentStatus() {
      try {
        const res = await fetch(`/api/emergencies/${encodeURIComponent(emergencyId)}/send-status-sms`)
        if (res.ok) {
          const data = await res.json()
          if (isMounted && data.data?.communication?.lastSmsStatus) {
            const currentStatus = data.data.communication.lastSmsStatus as SmsStatusState
            setStatus(currentStatus)
            if (data.data.communication.lastSmsRecipient) {
              setSuccessInfo({
                recipient: data.data.communication.lastSmsRecipient,
                provider: data.data.communication.lastSmsProvider
              })
            }
          }
        }
      } catch {
        // Non-blocking initial fetch failure
      }
    }

    fetchCurrentStatus()
    return () => {
      isMounted = false
    }
  }, [emergencyId])

  // Handle SMS dispatch
  const handleSendSms = async (targetMobile?: string) => {
    setStatus('SENDING')
    setErrorMessage(null)
    onStatusChange?.('SENDING')

    try {
      const payload: { recipientMobile?: string } = {}
      if (targetMobile && targetMobile.trim()) {
        payload.recipientMobile = targetMobile.trim()
      } else if (customMobile && customMobile.trim()) {
        payload.recipientMobile = customMobile.trim()
      } else if (defaultCallerContact) {
        payload.recipientMobile = defaultCallerContact
      }

      const res = await fetch(`/api/emergencies/${encodeURIComponent(emergencyId)}/send-status-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        const errMsg = data.message || `Provider error (${res.status})`
        setStatus('FAILED')
        setErrorMessage(errMsg)
        onStatusChange?.('FAILED', errMsg)
        return
      }

      // According to spec: If provider confirms API submission, show 'SUBMITTED'
      const finalStatus: SmsStatusState = data.status === 'DELIVERED' ? 'DELIVERED' : 'SUBMITTED'
      setStatus(finalStatus)
      setSuccessInfo({
        recipient: data.recipient,
        provider: data.provider
      })
      onStatusChange?.(finalStatus, data.message)
      setIsModalOpen(false)

      // Keep success state visible for 12 seconds before returning to READY
      setTimeout(() => {
        setStatus(prev => (prev === finalStatus ? 'READY' : prev))
      }, 12000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error communicating with server'
      setStatus('FAILED')
      setErrorMessage(msg)
      onStatusChange?.('FAILED', msg)
    }
  }

  // Visual styling depending on current state
  const getButtonContent = () => {
    switch (status) {
      case 'SENDING':
        return (
          <>
            <Loader2 className="size-4 animate-spin text-amber-300 shrink-0" />
            <span className="font-bold tracking-wide">SENDING SMS...</span>
          </>
        )
      case 'SUBMITTED':
        return (
          <>
            <CheckCircle2 className="size-4 text-emerald-300 shrink-0 animate-bounce" />
            <span className="font-black tracking-wide text-emerald-200">SMS SUBMITTED</span>
          </>
        )
      case 'DELIVERED':
        return (
          <>
            <CheckCircle2 className="size-4 text-emerald-300 shrink-0" />
            <span className="font-black tracking-wide text-emerald-200">SMS DELIVERED</span>
          </>
        )
      case 'FAILED':
        return (
          <>
            <AlertCircle className="size-4 text-rose-300 shrink-0" />
            <span className="font-bold tracking-wide text-rose-200">FAILED — RETRY</span>
          </>
        )
      case 'READY':
      default:
        return (
          <>
            <Send className="size-3.5 text-sky-300 shrink-0" />
            <span className="font-black tracking-wide">SEND STATUS SMS</span>
          </>
        )
    }
  }

  const getButtonClass = () => {
    switch (status) {
      case 'SENDING':
        return 'bg-amber-600/90 text-white border-amber-400 shadow-md animate-pulse cursor-wait'
      case 'SUBMITTED':
      case 'DELIVERED':
        return 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-950/50'
      case 'FAILED':
        return 'bg-rose-700 text-white border-rose-500 shadow-md hover:bg-rose-600'
      case 'READY':
      default:
        return 'bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white border-sky-400/50 shadow-md active:scale-95'
    }
  }

  return (
    <>
      <div className={`inline-flex items-center gap-1.5 ${className}`}>
        {/* Main Trigger Button */}
        <Button
          type="button"
          onClick={() => {
            if (status === 'READY' || status === 'FAILED') {
              setIsModalOpen(true)
            }
          }}
          disabled={status === 'SENDING'}
          className={`min-h-[42px] px-3.5 py-1.5 rounded-xl text-xs border transition-all flex items-center gap-2 touch-manipulation cursor-pointer ${getButtonClass()}`}
          title="Send real-time emergency status SMS to patient / contact"
        >
          {getButtonContent()}
        </Button>

        {/* Quick status badge if submitted */}
        {status === 'SUBMITTED' && successInfo?.recipient && (
          <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-950/80 text-[10px] font-mono text-emerald-300 border border-emerald-700/50">
            Sent to {successInfo.recipient}
          </span>
        )}
      </div>

      {/* Confirmation & Recipient Phone Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl text-white">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sky-400 font-black text-sm">
                <MessageSquare className="size-4" />
                <span>SWIFTCARE EMERGENCY SMS DISPATCH</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="my-4 space-y-3">
              <p className="text-xs text-slate-300">
                Dispatch transactional emergency status update to patient emergency contact via MSG91 Flow API.
              </p>

              {/* Message Payload Preview Box */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 space-y-2 text-xs font-mono">
                <div className="text-[11px] text-sky-400 font-bold uppercase tracking-wider">
                  Live Message Preview:
                </div>
                <div className="text-slate-200 text-xs leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="font-bold text-rose-400">SWIFTCARE ALERT:</span>
                  <br />
                  Ambulance <strong className="text-white">{ambulanceId}</strong> is responding to your emergency.
                  <br />
                  Current ETA: <strong className="text-emerald-400">{etaMinutes} min</strong>.
                  <br />
                  Destination: <strong className="text-white">{destinationHospital}</strong>.
                </div>
              </div>

              {/* Recipient Phone Input */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1">
                  <PhoneCall className="size-3.5 text-sky-400" />
                  <span>Recipient Mobile Number:</span>
                </label>
                <input
                  type="tel"
                  placeholder={defaultCallerContact || 'Enter 10-digit mobile number'}
                  value={customMobile}
                  onChange={(e) => setCustomMobile(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {customMobile ? 'Using custom number' : `Defaults to emergency caller contact: ${defaultCallerContact || 'Not on file'}`}
                </span>
              </div>

              {/* Error Message if any */}
              {errorMessage && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-300 flex items-start gap-2">
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="break-words">{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="min-h-[42px] rounded-xl border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-bold"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={() => handleSendSms()}
                disabled={status === 'SENDING' || (!customMobile && !defaultCallerContact)}
                className="min-h-[42px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-sky-900/40"
              >
                {status === 'SENDING' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="size-3.5" />
                    <span>Send Status SMS</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
