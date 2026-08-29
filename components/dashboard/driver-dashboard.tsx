'use client'

import { Eye, EyeOff, PhoneCall, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { getDashboard } from '@/lib/api'
import type { DashboardData } from '@/lib/mock-data'
import { DashboardTopbar } from './dashboard-topbar'
import { EtaSummary } from './eta-summary'
import { GeoAgentCard } from './geoagent-card'
import { MapPlaceholder } from './map-placeholder'
import { RouteStatusCards } from './route-status-cards'
import { TimelinePanel } from './timeline-panel'

function formatTime(date: Date) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function DriverDashboard({ data }: { data: DashboardData }) {
  const [lastRefreshed, setLastRefreshed] = useState(() =>
    formatTime(new Date()),
  )
  const [refreshing, setRefreshing] = useState(false)
  const [showRecommended, setShowRecommended] = useState(true)
  const [contactOpen, setContactOpen] = useState(false)
  const [contactSent, setContactSent] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    // Re-run the API adapter (mock today, real GET /api/dashboard/:id later).
    await getDashboard(data.ambulanceId)
    setLastRefreshed(formatTime(new Date()))
    setRefreshing(false)
  }

  return (
    <div className="min-h-svh bg-background">
      <DashboardTopbar
        ambulanceId={data.ambulanceId}
        driverName={data.driverName}
        emergencyActive={data.emergencyActive}
        lastRefreshed={lastRefreshed}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Action bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Button onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={refreshing ? 'animate-spin' : undefined} />
            Refresh Route
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowRecommended((v) => !v)}
            aria-pressed={showRecommended}
          >
            {showRecommended ? <EyeOff /> : <Eye />}
            View Alternative Route
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setContactSent(false)
              setContactOpen(true)
            }}
          >
            <PhoneCall />
            Contact Control Room
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            Last refreshed: {lastRefreshed}
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left column: ETA summary, large map, then timeline */}
          <div className="space-y-6 lg:col-span-3">
            <EtaSummary data={data} />
            <MapPlaceholder
              markers={data.markers}
              showRecommended={showRecommended}
            />
            <TimelinePanel events={data.timeline} />
          </div>

          {/* Right column: deviation & benefit analysis */}
          <div className="space-y-6 lg:col-span-2">
            <RouteStatusCards data={data} />
            <GeoAgentCard explanation={data.explanation} />
          </div>
        </div>
      </main>

      <Modal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title={contactSent ? 'Control room notified' : 'Contact control room?'}
        description={
          contactSent
            ? `A voice channel request for ${data.ambulanceId} has been queued (prototype).`
            : `This will open a priority line to the control room for ambulance ${data.ambulanceId}.`
        }
        footer={
          contactSent ? (
            <Button onClick={() => setContactOpen(false)}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setContactOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setContactSent(true)}
              >
                <PhoneCall />
                Confirm call
              </Button>
            </>
          )
        }
      />
    </div>
  )
}
