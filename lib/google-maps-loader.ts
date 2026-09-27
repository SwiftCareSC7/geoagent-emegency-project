/**
 * SwiftCare GeoAgent — Google Maps Platform API Loader & Theme Styles
 *
 * Provides a robust singleton loader for Google Maps JavaScript API with:
 * - Real-time TrafficLayer support
 * - Dark & Light tactical map themes optimized for emergency corridors
 * - Custom SVG icon builders preserving SwiftCare visual semantics:
 *     Blue = Active/Planned Corridor
 *     Purple = Recommended Alternative Detour
 *     Orange = GPS Trajectory
 *     Red = Incident / Hazard
 *     Emerald = Receiving Hospital
 */

import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let googleMapsPromise: Promise<typeof google> | null = null

export function isGoogleMapsLoaded(): boolean {
  return typeof window !== 'undefined' && Boolean(window.google?.maps)
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps cannot be loaded on server'))
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google)
  }

  if (!googleMapsPromise) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    if (!apiKey) {
      return Promise.reject(new Error('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured'))
    }

    setOptions({
      key: apiKey,
      v: 'weekly',
    })

    googleMapsPromise = Promise.all([
      importLibrary('maps'),
      importLibrary('marker'),
      importLibrary('geometry'),
    ]).then(() => window.google)
  }

  return googleMapsPromise
}

/**
 * Tactical Dark Mode Style Array for Google Maps
 * Deep slate base (#090d16 / #172033) that makes:
 * - Google TrafficLayer (Green, Yellow, Orange, Red) vividly visible
 * - SwiftCare Blue (Active Corridor) and Purple (Recommended Detour) pop with maximum contrast
 */
export const GOOGLE_MAPS_DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#090d16' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#090d16' }, { weight: 3 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0d1f1c' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#172033' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0d131f' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0f172a' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#050c17' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
]

/**
 * Tactical Light Mode Style Array for Google Maps
 * Crisp, clean daylight map style ensuring Google Traffic and emergency lines stand out
 */
export const GOOGLE_MAPS_LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9e2f4' }],
  },
  {
    featureType: 'landscape',
    elementType: 'geometry',
    stylers: [{ color: '#f5f7fa' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#e2e8f0' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#e3f3e8' }],
  },
]
