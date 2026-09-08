/**
 * SwiftCare GeoAgent — Driver Navigation Type Definitions
 */

import type { GeoJSONPoint, Incident, Vehicle } from '@/lib/api/types';

export type NavigationState =
  | 'IDLE'
  | 'ROUTE_CALCULATING'
  | 'NAVIGATING'
  | 'APPROACHING_TURN'
  | 'OFF_ROUTE'
  | 'REROUTING'
  | 'ARRIVING'
  | 'ARRIVED'
  | 'ERROR';

export type ManeuverType =
  | 'DEPART'
  | 'TURN_LEFT'
  | 'TURN_RIGHT'
  | 'CONTINUE'
  | 'KEEP_RIGHT'
  | 'KEEP_LEFT'
  | 'U_TURN'
  | 'ARRIVE';

export interface NavigationStep {
  maneuver: ManeuverType;
  instruction: string;
  distance: number; // meters
  duration: number; // seconds
  startLocation?: [number, number]; // [lng, lat]
  endLocation?: [number, number]; // [lng, lat]
  stepPolyline?: [number, number][];
}

export interface RoutePlan {
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds?: number;
  trafficDelaySeconds?: number;
  preference: 'FASTEST' | 'SHORTEST';
  description?: string;
  provider: string;
  steps: NavigationStep[];
  alternative?: {
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
    distanceMeters: number;
    durationSeconds: number;
    preference: 'FASTEST' | 'SHORTEST';
    description?: string;
    steps?: NavigationStep[];
    trafficDelaySeconds?: number;
  } | null;
  calculatedAt: string;
}

export interface GpsLocation {
  coordinates: [number, number]; // [lng, lat]
  heading: number | null; // 0-360 degrees
  speed: number | null; // km/h
  accuracy: number | null; // meters
  timestamp: number;
  isSimulated?: boolean;
}

export interface DestinationOption {
  id: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [lng, lat]
  emergencyId?: string;
  hospitalCode?: string;
}

export interface LandmarkOption {
  id: string;
  name: string;
  area: string;
  coordinates: [number, number]; // [lng, lat]
}

export const BENGALURU_HOSPITALS: DestinationOption[] = [
  {
    id: 'hosp-manipal',
    name: 'Manipal Hospital',
    address: '98 HAL Old Airport Rd, Kodihalli, Bengaluru',
    coordinates: [77.6483, 12.9582],
    hospitalCode: 'MAN-01'
  },
  {
    id: 'hosp-victoria',
    name: 'Victoria Hospital',
    address: 'Fort Road, near City Market, Bengaluru',
    coordinates: [77.5739, 12.9634],
    hospitalCode: 'VIC-01'
  },
  {
    id: 'hosp-bowring',
    name: 'Bowring & Lady Curzon Hospital',
    address: 'Lady Curzon Rd, Tasker Town, Shivajinagar, Bengaluru',
    coordinates: [77.6033, 12.9833],
    hospitalCode: 'BOW-01'
  },
  {
    id: 'hosp-stjohns',
    name: 'St. John’s Medical College Hospital',
    address: 'Sarjapur Main Road, John Nagar, Koramangala, Bengaluru',
    coordinates: [77.6200, 12.9315],
    hospitalCode: 'STJ-01'
  },
  {
    id: 'hosp-apollo',
    name: 'Apollo Hospital (Bannerghatta)',
    address: '154/11 Opp IIM-B, Bannerghatta Rd, Bengaluru',
    coordinates: [77.5980, 12.8920],
    hospitalCode: 'APO-01'
  },
  {
    id: 'hosp-fortis',
    name: 'Fortis Hospital (Cunningham Rd)',
    address: '14 Cunningham Rd, Vasanth Nagar, Bengaluru',
    coordinates: [77.5985, 12.9860],
    hospitalCode: 'FOR-01'
  }
];

export const BENGALURU_LANDMARKS: LandmarkOption[] = [
  {
    id: 'lm-koramangala',
    name: 'Koramangala 4th Block',
    area: 'South Bengaluru',
    coordinates: [77.6271, 12.9352]
  },
  {
    id: 'lm-hebbal',
    name: 'Hebbal Flyover Ramp',
    area: 'North Bengaluru',
    coordinates: [77.5925, 13.0358]
  },
  {
    id: 'lm-whitefield',
    name: 'Whitefield Main Road / ITPL',
    area: 'East Bengaluru',
    coordinates: [77.7500, 12.9698]
  },
  {
    id: 'lm-yelahanka',
    name: 'Yelahanka Police Station',
    area: 'North Bengaluru',
    coordinates: [77.5963, 13.1007]
  },
  {
    id: 'lm-ecity',
    name: 'Electronic City Phase 1 Toll',
    area: 'South Bengaluru',
    coordinates: [77.6766, 12.8452]
  },
  {
    id: 'lm-mgroad',
    name: 'MG Road Metro Station',
    area: 'Central Bengaluru',
    coordinates: [77.5946, 12.9716]
  },
  {
    id: 'lm-indiranagar',
    name: '100ft Road Indiranagar',
    area: 'East Bengaluru',
    coordinates: [77.6412, 12.9784]
  }
];
