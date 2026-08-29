import { AlertTriangle, Ambulance, Hospital, TrafficCone } from 'lucide-react'

import type { MapMarker } from '@/lib/mock-data'

interface MapPlaceholderProps {
  markers: MapMarker[]
  showRecommended: boolean
}

const legend = [
  { color: 'var(--route-planned)', label: 'Planned Route' },
  { color: 'var(--route-actual)', label: 'Current Path' },
  { color: 'var(--route-recommended)', label: 'Alternative Route B' },
  { color: 'var(--critical)', label: 'Accident' },
  { color: 'var(--warning)', label: 'Congestion' },
]

const markerMeta = {
  ambulance: { Icon: Ambulance, color: 'var(--navy)' },
  accident: { Icon: AlertTriangle, color: 'var(--critical)' },
  congestion: { Icon: TrafficCone, color: 'var(--warning)' },
  destination: { Icon: Hospital, color: 'var(--success)' },
} as const

export function MapPlaceholder({
  markers,
  showRecommended,
}: MapPlaceholderProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="font-display text-sm font-bold text-card-foreground">
          Live Route Map · Bengaluru
        </h3>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Leaflet-ready placeholder
        </span>
      </div>

      <div className="relative">
        <div className="relative aspect-[4/3] w-full bg-[#eef1f5]">
          <svg
            viewBox="0 0 100 75"
            className="absolute inset-0 size-full"
            role="img"
            aria-label="Schematic map showing the ambulance location, planned route, actual trajectory, recommended alternative route, accident and congestion markers, and the destination hospital."
            preserveAspectRatio="none"
          >
            {/* City block grid */}
            <g stroke="#dbe1ea" strokeWidth="0.4">
              {Array.from({ length: 9 }).map((_, i) => (
                <line key={`v${i}`} x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2="75" />
              ))}
              {Array.from({ length: 7 }).map((_, i) => (
                <line key={`h${i}`} x1="0" y1={(i + 1) * 10} x2="100" y2={(i + 1) * 10} />
              ))}
            </g>
            {/* Suggested block fills */}
            <g fill="#e3e8ef" opacity="0.7">
              <rect x="22" y="12" width="16" height="14" rx="1" />
              <rect x="62" y="30" width="18" height="16" rx="1" />
              <rect x="20" y="42" width="14" height="18" rx="1" />
            </g>

            {/* Planned route (blue) */}
            <path
              d="M12,63 C 30,54 38,50 42,47 S 52,40 55,36 S 78,22 88,13"
              fill="none"
              stroke="var(--route-planned)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray="3 2.5"
            />
            {/* Recommended alternative route (purple) */}
            {showRecommended ? (
              <path
                d="M12,63 C 26,46 30,30 50,24 S 76,16 88,13"
                fill="none"
                stroke="var(--route-recommended)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : null}
            {/* Actual trajectory travelled so far (green) */}
            <path
              d="M12,63 C 22,57 30,53 37,49"
              fill="none"
              stroke="var(--route-actual)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>

          {/* Markers (HTML overlay for crisp icons) */}
          {markers.map((m) => {
            const { Icon, color } = markerMeta[m.type]
            const isAmb = m.type === 'ambulance'
            return (
              <div
                key={m.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${m.x}%`, top: `${m.y}%` }}
              >
                <div
                  className="flex items-center justify-center rounded-full shadow-md ring-2 ring-white"
                  style={{
                    backgroundColor: color,
                    width: isAmb ? 32 : 26,
                    height: isAmb ? 32 : 26,
                  }}
                >
                  <Icon
                    className="text-white"
                    style={{ width: isAmb ? 18 : 14, height: isAmb ? 18 : 14 }}
                    aria-hidden="true"
                  />
                </div>
                <span className="sr-only">{m.label}</span>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-border bg-card px-4 py-3">
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span
                className="inline-block size-3 rounded-full"
                style={{ backgroundColor: item.color }}
                aria-hidden="true"
              />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
          ))}
          {!showRecommended ? (
            <span className="text-xs italic text-muted-foreground">
              (Alternative Route B hidden)
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
