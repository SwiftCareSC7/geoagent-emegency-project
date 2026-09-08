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

export type RouteLegType = 'TO_EMERGENCY' | 'TO_HOSPITAL';
export type RouteLegStatus = 'ACTIVE' | 'PLANNED' | 'COMPLETED';

export type EmergencyStage = 
  | 'HEADING_TO_EMERGENCY'
  | 'AT_EMERGENCY'
  | 'TRANSPORTING_TO_HOSPITAL'
  | 'ARRIVING_AT_HOSPITAL'
  | 'ARRIVED';

export interface RouteLeg {
  legNumber: number; // 1 (To Emergency) or 2 (To Hospital)
  type: RouteLegType;
  title: string;
  originName?: string;
  destinationName?: string;
  originCoordinates: [number, number]; // [lng, lat]
  destinationCoordinates: [number, number]; // [lng, lat]
  geometry: {
    type: 'LineString';
    coordinates: [number, number][]; // [lng, lat]
  };
  distanceMeters: number;
  durationSeconds: number;
  steps: NavigationStep[];
  status: RouteLegStatus;
  trafficDelaySeconds?: number;
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
  // Multi-leg journey support
  legs?: RouteLeg[];
  activeLegIndex?: number; // 0 = Leg 1 (To Emergency), 1 = Leg 2 (To Hospital)
  emergencyLocation?: [number, number];
  hospitalLocation?: [number, number];
  alternative?: {
    affectedLegNumber?: number; // 1 or 2
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
  },
  {
    id: 'hosp-sakra',
    name: 'Sakra World Hospital',
    address: 'Devarabeesanahalli, Bellandur, Bengaluru',
    coordinates: [77.6890, 12.9288],
    hospitalCode: 'SAK-01'
  },
  {
    id: 'hosp-narayana',
    name: 'Narayana Health City',
    address: 'Bommasandra Industrial Area, Anekal Taluk, Bengaluru',
    coordinates: [77.6912, 12.8123],
    hospitalCode: 'NHC-01'
  },
  {
    id: 'hosp-aster',
    name: 'Aster CMI Hospital',
    address: 'No. 43/42, NH 44, Sahakar Nagar, Hebbal, Bengaluru',
    coordinates: [77.5906, 13.0560],
    hospitalCode: 'AST-01'
  },
  {
    id: 'hosp-baptist',
    name: 'Bangalore Baptist Hospital',
    address: 'Bellary Rd, Vinayakanagar, Hebbal, Bengaluru',
    coordinates: [77.5855, 13.0310],
    hospitalCode: 'BBH-01'
  },
  {
    id: 'hosp-ramaiah',
    name: 'Ramaiah Memorial Hospital',
    address: 'MSR Nagar, Gnanabharathi, Bengaluru',
    coordinates: [77.5684, 13.0305],
    hospitalCode: 'RMH-01'
  },
  {
    id: 'hosp-vydehi',
    name: 'Vydehi Hospital',
    address: '82, EPIP Area, Whitefield, Bengaluru',
    coordinates: [77.7289, 12.9760],
    hospitalCode: 'VYD-01'
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
  },
  {
    id: 'lm-hsr',
    name: 'HSR Layout Sector 1 BDA Complex',
    area: 'South-East Bengaluru',
    coordinates: [77.6389, 12.9116]
  },
  {
    id: 'lm-marathahalli',
    name: 'Marathahalli Bridge Junction',
    area: 'East Bengaluru',
    coordinates: [77.7011, 12.9592]
  },
  {
    id: 'lm-jayanagar',
    name: 'Jayanagar 4th Block Complex',
    area: 'South Bengaluru',
    coordinates: [77.5833, 12.9298]
  },
  {
    id: 'lm-jpnagar',
    name: 'JP Nagar 6th Phase Circle',
    area: 'South Bengaluru',
    coordinates: [77.5855, 12.9063]
  },
  {
    id: 'lm-bellandur',
    name: 'Bellandur Central Mall Ring Rd',
    area: 'South-East Bengaluru',
    coordinates: [77.6744, 12.9260]
  },
  {
    id: 'lm-sarjapur',
    name: 'Sarjapur Signal Wipro Gate',
    area: 'South-East Bengaluru',
    coordinates: [77.6850, 12.9100]
  },
  {
    id: 'lm-domlur',
    name: 'Domlur Intermediate Ring Rd',
    area: 'East Bengaluru',
    coordinates: [77.6380, 12.9610]
  },
  {
    id: 'lm-rajajinagar',
    name: 'Rajajinagar 1st Block Metro',
    area: 'West Bengaluru',
    coordinates: [77.5550, 12.9980]
  },
  {
    id: 'lm-peenya',
    name: 'Peenya 1st Stage Industrial Area',
    area: 'North-West Bengaluru',
    coordinates: [77.5180, 13.0280]
  },
  {
    id: 'lm-krpuram',
    name: 'KR Puram Hanging Bridge',
    area: 'East Bengaluru',
    coordinates: [77.6950, 13.0075]
  }
];
