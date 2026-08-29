/**
 * SwiftCare GeoAgent — mock dashboard data
 *
 * PROTOTYPE / DEMO DATA ONLY. All values here are static mock data used to
 * drive the frontend UI. There is no backend, no GPS, and no real medical
 * data. Times and time savings are estimated demo values.
 * Replace `getDashboard` in `lib/api.ts` with a real fetch when a backend
 * (GET /api/dashboard/:ambulanceId) becomes available.
 */

export type RouteStatus = 'On Track' | 'Deviated' | 'Rerouted'
export type Severity = 'critical' | 'warning' | 'success' | 'info'

export interface TimelineEvent {
  id: string
  label: string
  detail: string
  time: string
  severity: Severity
}

export interface MapMarker {
  id: string
  type: 'ambulance' | 'accident' | 'congestion' | 'destination'
  /** normalized 0-100 coordinates for the schematic map placeholder */
  x: number
  y: number
  label: string
}

export interface DashboardData {
  ambulanceId: string
  driverName: string
  vehicle: string
  base: string
  pickup: string
  emergencyActive: boolean
  lastUpdated: string
  routeStatus: RouteStatus
  routeStatusLabel: string
  cause: string
  incidentLocation: string
  incidentSeverity: string
  originalEtaMin: number
  currentRouteEtaMin: number
  newEtaMin: number
  timeSavedMin: number
  recommendedRoute: string
  recommendation: string
  backupAmbulance: string
  explanation: string
  destination: string
  destinationFull: string
  routeContext: string
  arriveBy: string
  timeline: TimelineEvent[]
  markers: MapMarker[]
}

/** Static demo contact details for the Bengaluru operation. */
export const SITE_CONTACT = {
  name: 'SwiftCare Bengaluru Support',
  phone: '080 5555 0199',
  email: 'support@swiftcare.demo',
  base: 'Koramangala 5th Block, Bengaluru, Karnataka',
} as const

export const AMB_01_DASHBOARD: DashboardData = {
  ambulanceId: 'KA-01-AMB-108',
  driverName: 'Ananya Rao',
  vehicle: 'SwiftCare Advanced Life Support Ambulance',
  base: 'Koramangala 5th Block, Bengaluru, Karnataka',
  pickup: '80 Feet Road, Koramangala, Bengaluru',
  emergencyActive: true,
  lastUpdated: 'Today, 16:45 IST',
  routeStatus: 'Deviated',
  routeStatusLabel: 'Deviation detected',
  cause: 'Road accident + heavy congestion on 100 Feet Road, Indiranagar',
  incidentLocation: '100 Feet Road, Indiranagar, Bengaluru',
  incidentSeverity: 'High',
  originalEtaMin: 16,
  currentRouteEtaMin: 16,
  newEtaMin: 10,
  timeSavedMin: 6,
  recommendedRoute: 'Alternative Route B',
  recommendation: 'Follow Alternative Route B',
  backupAmbulance: 'Not required',
  destination: 'Manipal Hospital, HAL Old Airport Road',
  destinationFull:
    'Manipal Hospital, 98 HAL Old Airport Road, Kodihalli, Bengaluru 560017',
  routeContext: 'Koramangala → Domlur → HAL Old Airport Road → Manipal Hospital',
  arriveBy: '16:55 IST',
  explanation:
    'A high-severity accident near Indiranagar is affecting the planned route. Alternative Route B via Domlur is estimated to reduce travel time by 6 minutes.',
  timeline: [
    {
      id: 'evt-1',
      label: 'Accident reported near Indiranagar',
      detail: 'Collision reported on 100 Feet Road, Indiranagar.',
      time: '16:39 IST',
      severity: 'critical',
    },
    {
      id: 'evt-2',
      label: 'Congestion level increased',
      detail: 'Traffic speed dropped sharply along the planned corridor.',
      time: '16:41 IST',
      severity: 'warning',
    },
    {
      id: 'evt-3',
      label: 'Route deviation detected',
      detail: 'GeoAgent flagged the planned route as delayed.',
      time: '16:43 IST',
      severity: 'info',
    },
    {
      id: 'evt-4',
      label: 'Alternative Route B recommended',
      detail: 'Route B via Domlur selected — an estimated 6 minutes saved.',
      time: '16:45 IST',
      severity: 'success',
    },
  ],
  markers: [
    {
      id: 'amb',
      type: 'ambulance',
      x: 12,
      y: 78,
      label: 'Ambulance KA-01-AMB-108 · Koramangala',
    },
    {
      id: 'acc',
      type: 'accident',
      x: 55,
      y: 44,
      label: 'Road accident · 100 Feet Road, Indiranagar',
    },
    { id: 'cong', type: 'congestion', x: 42, y: 58, label: 'Heavy congestion · Domlur' },
    {
      id: 'dest',
      type: 'destination',
      x: 88,
      y: 16,
      label: 'Manipal Hospital · HAL Old Airport Road',
    },
  ],
}
