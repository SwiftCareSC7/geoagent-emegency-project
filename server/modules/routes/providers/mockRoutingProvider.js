import { calculateDistance } from '../../../shared/services/geospatial.service.js';
import osrmRoutingProvider from './osrmRoutingProvider.js';

/**
 * Predefined realistic Bengaluru Navigation Corridors
 * for canonical demo scenarios and testing.
 */
const BENGALURU_CORRIDORS = [
  // 1. Koramangala -> Manipal Hospital (Old Airport Road)
  {
    id: 'KORAMANGALA_MANIPAL',
    match: (orig, dest) =>
      Math.hypot(orig[0] - 77.6271, orig[1] - 12.9352) < 0.03 &&
      Math.hypot(dest[0] - 77.6483, dest[1] - 12.9582) < 0.03,
    fastest: {
      description: 'Via Intermediate Ring Road & Old Airport Road (Fastest / Traffic-Aware)',
      coordinates: [
        [77.6271, 12.9352], // Koramangala 4th Block
        [77.6320, 12.9410], // Sony World Signal
        [77.6385, 12.9490], // Intermediate Ring Road Flyover
        [77.6398, 12.9535], // Domlur Inner Ring Road
        [77.6440, 12.9565], // Command Hospital Junction
        [77.6483, 12.9582]  // Manipal Hospital Main Gate
      ],
      distanceMeters: 4850,
      durationSeconds: 660, // 11 min
      staticDurationSeconds: 540,
      trafficDelaySeconds: 120,
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head north on 80 Feet Road toward Sony World Signal',
          distance: 750,
          duration: 110,
          startLocation: [77.6271, 12.9352],
          endLocation: [77.6320, 12.9410],
          stepPolyline: [[77.6271, 12.9352], [77.6320, 12.9410]]
        },
        {
          maneuver: 'TURN_RIGHT',
          instruction: 'Turn right onto Intermediate Ring Road',
          distance: 1400,
          duration: 180,
          startLocation: [77.6320, 12.9410],
          endLocation: [77.6385, 12.9490],
          stepPolyline: [[77.6320, 12.9410], [77.6385, 12.9490]]
        },
        {
          maneuver: 'CONTINUE',
          instruction: 'Continue straight across Domlur Flyover',
          distance: 800,
          duration: 110,
          startLocation: [77.6385, 12.9490],
          endLocation: [77.6398, 12.9535],
          stepPolyline: [[77.6385, 12.9490], [77.6398, 12.9535]]
        },
        {
          maneuver: 'KEEP_RIGHT',
          instruction: 'Take the ramp onto Old Airport Road past Command Hospital',
          distance: 1200,
          duration: 160,
          startLocation: [77.6398, 12.9535],
          endLocation: [77.6440, 12.9565],
          stepPolyline: [[77.6398, 12.9535], [77.6440, 12.9565]]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Arrive at Manipal Hospital Emergency Entrance on the right',
          distance: 700,
          duration: 100,
          startLocation: [77.6440, 12.9565],
          endLocation: [77.6483, 12.9582],
          stepPolyline: [[77.6440, 12.9565], [77.6483, 12.9582]]
        }
      ]
    },
    shortest: {
      description: 'Via Indiranagar 100ft Rd & HAL 2nd Stage (Shortest Distance)',
      coordinates: [
        [77.6271, 12.9352],
        [77.6310, 12.9440],
        [77.6370, 12.9510],
        [77.6430, 12.9550],
        [77.6483, 12.9582]
      ],
      distanceMeters: 4200, // Shorter by 650m
      durationSeconds: 840, // 14 min (slower due to dense city market signals)
      staticDurationSeconds: 600,
      trafficDelaySeconds: 240,
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head northeast on 1st Main Rd toward 100 Feet Road',
          distance: 1100,
          duration: 220,
          startLocation: [77.6271, 12.9352],
          endLocation: [77.6310, 12.9440],
          stepPolyline: [[77.6271, 12.9352], [77.6310, 12.9440]]
        },
        {
          maneuver: 'TURN_LEFT',
          instruction: 'Turn left into HAL 2nd Stage 12th Main',
          distance: 1300,
          duration: 260,
          startLocation: [77.6310, 12.9440],
          endLocation: [77.6370, 12.9510],
          stepPolyline: [[77.6310, 12.9440], [77.6370, 12.9510]]
        },
        {
          maneuver: 'TURN_RIGHT',
          instruction: 'Turn right onto Kodihalli Main Road toward Old Airport Rd',
          distance: 1100,
          duration: 230,
          startLocation: [77.6370, 12.9510],
          endLocation: [77.6430, 12.9550],
          stepPolyline: [[77.6370, 12.9510], [77.6430, 12.9550]]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Arrive at Manipal Hospital Emergency Entrance',
          distance: 700,
          duration: 130,
          startLocation: [77.6430, 12.9550],
          endLocation: [77.6483, 12.9582],
          stepPolyline: [[77.6430, 12.9550], [77.6483, 12.9582]]
        }
      ]
    }
  },

  // 2. Hebbal -> Victoria Hospital (Fort/K.R. Market)
  {
    id: 'HEBBAL_VICTORIA',
    match: (orig, dest) =>
      Math.hypot(orig[0] - 77.5925, orig[1] - 13.0358) < 0.04 &&
      Math.hypot(dest[0] - 77.5739, dest[1] - 12.9634) < 0.04,
    fastest: {
      description: 'Via Bellary Road Elevated Corridor & Mysore Road (Fastest)',
      coordinates: [
        [77.5925, 13.0358], // Hebbal Flyover
        [77.5870, 13.0100], // Mekhri Circle
        [77.5830, 12.9850], // Palace Guttahalli
        [77.5780, 12.9740], // Anand Rao Circle
        [77.5739, 12.9634]  // Victoria Hospital (KR Market)
      ],
      distanceMeters: 10400,
      durationSeconds: 1140, // 19 min
      staticDurationSeconds: 960,
      trafficDelaySeconds: 180,
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head south on Bellary Road toward Mekhri Circle Underpass',
          distance: 3100,
          duration: 310,
          startLocation: [77.5925, 13.0358],
          endLocation: [77.5870, 13.0100],
          stepPolyline: [[77.5925, 13.0358], [77.5870, 13.0100]]
        },
        {
          maneuver: 'CONTINUE',
          instruction: 'Take the underpass to continue onto Palace Road',
          distance: 3200,
          duration: 350,
          startLocation: [77.5870, 13.0100],
          endLocation: [77.5830, 12.9850],
          stepPolyline: [[77.5870, 13.0100], [77.5830, 12.9850]]
        },
        {
          maneuver: 'KEEP_LEFT',
          instruction: 'Keep left toward Anand Rao Circle Flyover',
          distance: 2100,
          duration: 250,
          startLocation: [77.5830, 12.9850],
          endLocation: [77.5780, 12.9740],
          stepPolyline: [[77.5830, 12.9850], [77.5780, 12.9740]]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Turn slightly right into Victoria Hospital Emergency Block',
          distance: 2000,
          duration: 230,
          startLocation: [77.5780, 12.9740],
          endLocation: [77.5739, 12.9634],
          stepPolyline: [[77.5780, 12.9740], [77.5739, 12.9634]]
        }
      ]
    },
    shortest: {
      description: 'Via RT Nagar & Seshadripuram Main Road (Shortest Distance)',
      coordinates: [
        [77.5925, 13.0358],
        [77.5910, 13.0180],
        [77.5840, 12.9900],
        [77.5770, 12.9700],
        [77.5739, 12.9634]
      ],
      distanceMeters: 9200,
      durationSeconds: 1440, // 24 min
      staticDurationSeconds: 1080,
      trafficDelaySeconds: 360,
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head south through RT Nagar Main Road',
          distance: 2300,
          duration: 360,
          startLocation: [77.5925, 13.0358],
          endLocation: [77.5910, 13.0180],
          stepPolyline: [[77.5925, 13.0358], [77.5910, 13.0180]]
        },
        {
          maneuver: 'TURN_RIGHT',
          instruction: 'Turn right onto Kumara Krupa Road toward Seshadripuram',
          distance: 3400,
          duration: 540,
          startLocation: [77.5910, 13.0180],
          endLocation: [77.5840, 12.9900],
          stepPolyline: [[77.5910, 13.0180], [77.5840, 12.9900]]
        },
        {
          maneuver: 'CONTINUE',
          instruction: 'Proceed south on BVK Iyengar Road',
          distance: 2500,
          duration: 390,
          startLocation: [77.5840, 12.9900],
          endLocation: [77.5770, 12.9700],
          stepPolyline: [[77.5840, 12.9900], [77.5770, 12.9700]]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Arrive at Victoria Hospital Trauma Centre Gate',
          distance: 1000,
          duration: 150,
          startLocation: [77.5770, 12.9700],
          endLocation: [77.5739, 12.9634],
          stepPolyline: [[77.5770, 12.9700], [77.5739, 12.9634]]
        }
      ]
    }
  },

  // 3. Whitefield -> Manipal Hospital
  {
    id: 'WHITEFIELD_MANIPAL',
    match: (orig, dest) =>
      Math.hypot(orig[0] - 77.7500, orig[1] - 12.9698) < 0.05 &&
      Math.hypot(dest[0] - 77.6483, dest[1] - 12.9582) < 0.04,
    fastest: {
      description: 'Via HAL Old Airport Road (Fastest Arterial Route)',
      coordinates: [
        [77.7500, 12.9698], // ITPL / Whitefield Main
        [77.7120, 12.9590], // Kundalahalli Gate
        [77.6850, 12.9560], // Marathahalli Bridge
        [77.6600, 12.9575], // Murugeshpalya
        [77.6483, 12.9582]  // Manipal Hospital
      ],
      distanceMeters: 13800,
      durationSeconds: 1560, // 26 min
      staticDurationSeconds: 1200,
      trafficDelaySeconds: 360,
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head west on Whitefield Main Road toward Kundalahalli',
          distance: 4500,
          duration: 480,
          startLocation: [77.7500, 12.9698],
          endLocation: [77.7120, 12.9590],
          stepPolyline: [[77.7500, 12.9698], [77.7120, 12.9590]]
        },
        {
          maneuver: 'CONTINUE',
          instruction: 'Pass through Kundalahalli Underpass to Marathahalli',
          distance: 3300,
          duration: 380,
          startLocation: [77.7120, 12.9590],
          endLocation: [77.6850, 12.9560],
          stepPolyline: [[77.7120, 12.9590], [77.6850, 12.9560]]
        },
        {
          maneuver: 'CONTINUE',
          instruction: 'Proceed west on Old Airport Road past HAL Heritage Centre',
          distance: 3800,
          duration: 450,
          startLocation: [77.6850, 12.9560],
          endLocation: [77.6600, 12.9575],
          stepPolyline: [[77.6850, 12.9560], [77.6600, 12.9575]]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Arrive at Manipal Hospital Emergency Entrance',
          distance: 2200,
          duration: 250,
          startLocation: [77.6600, 12.9575],
          endLocation: [77.6483, 12.9582],
          stepPolyline: [[77.6600, 12.9575], [77.6483, 12.9582]]
        }
      ]
    },
    shortest: {
      description: 'Via Varthur Road & Wind Tunnel Road (Shortest)',
      coordinates: [
        [77.7500, 12.9698],
        [77.7050, 12.9420],
        [77.6700, 12.9490],
        [77.6483, 12.9582]
      ],
      distanceMeters: 12200,
      durationSeconds: 1980, // 33 min
      staticDurationSeconds: 1350,
      trafficDelaySeconds: 630,
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head southwest via Varthur Kodi toward Wind Tunnel Rd',
          distance: 5400,
          duration: 900,
          startLocation: [77.7500, 12.9698],
          endLocation: [77.7050, 12.9420],
          stepPolyline: [[77.7500, 12.9698], [77.7050, 12.9420]]
        },
        {
          maneuver: 'TURN_RIGHT',
          instruction: 'Turn right onto Wind Tunnel Road',
          distance: 4300,
          duration: 720,
          startLocation: [77.7050, 12.9420],
          endLocation: [77.6700, 12.9490],
          stepPolyline: [[77.7050, 12.9420], [77.6700, 12.9490]]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Arrive at Manipal Hospital',
          distance: 2500,
          duration: 360,
          startLocation: [77.6700, 12.9490],
          endLocation: [77.6483, 12.9582],
          stepPolyline: [[77.6700, 12.9490], [77.6483, 12.9582]]
        }
      ]
    }
  },

  // 4. Yelahanka -> Bowring Hospital (Shivajinagar)
  {
    id: 'YELAHANKA_BOWRING',
    match: (orig, dest) =>
      Math.hypot(orig[0] - 77.5963, orig[1] - 13.1007) < 0.05 &&
      Math.hypot(dest[0] - 77.6033, dest[1] - 12.9833) < 0.04,
    fastest: {
      description: 'Via NH 44 / Bellary Road Expressway (Fastest)',
      coordinates: [
        [77.5963, 13.1007], // Yelahanka Police Station
        [77.5940, 13.0600], // Jakkur Aerodrome
        [77.5920, 13.0300], // Hebbal
        [77.5980, 13.0000], // Cantonment
        [77.6033, 12.9833]  // Bowring Hospital
      ],
      distanceMeters: 14200,
      durationSeconds: 1320, // 22 min (Stable/Normal traffic)
      staticDurationSeconds: 1200,
      trafficDelaySeconds: 120,
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head south on NH 44 / Bellary Rd toward Hebbal Flyover',
          distance: 7200,
          duration: 620,
          startLocation: [77.5963, 13.1007],
          endLocation: [77.5920, 13.0300],
          stepPolyline: [[77.5963, 13.1007], [77.5940, 13.0600], [77.5920, 13.0300]]
        },
        {
          maneuver: 'CONTINUE',
          instruction: 'Continue south on Jayamahal Road toward Cantonment',
          distance: 4600,
          duration: 440,
          startLocation: [77.5920, 13.0300],
          endLocation: [77.5980, 13.0000],
          stepPolyline: [[77.5920, 13.0300], [77.5980, 13.0000]]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Turn left onto Lady Curzon Road into Bowring & Lady Curzon Hospital',
          distance: 2400,
          duration: 260,
          startLocation: [77.5980, 13.0000],
          endLocation: [77.6033, 12.9833],
          stepPolyline: [[77.5980, 13.0000], [77.6033, 12.9833]]
        }
      ]
    },
    shortest: {
      description: 'Via Vidyaranyapura & Mehkri Circle (Shortest)',
      coordinates: [
        [77.5963, 13.1007],
        [77.5780, 13.0500],
        [77.5850, 13.0050],
        [77.6033, 12.9833]
      ],
      distanceMeters: 13100,
      durationSeconds: 1500, // 25 min
      staticDurationSeconds: 1250,
      trafficDelaySeconds: 250,
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head southwest toward Vidyaranyapura Main Rd',
          distance: 5800,
          duration: 650,
          startLocation: [77.5963, 13.1007],
          endLocation: [77.5780, 13.0500],
          stepPolyline: [[77.5963, 13.1007], [77.5780, 13.0500]]
        },
        {
          maneuver: 'TURN_LEFT',
          instruction: 'Turn left onto Sanjay Nagar Main Rd toward Mehkri Circle',
          distance: 4800,
          duration: 550,
          startLocation: [77.5780, 13.0500],
          endLocation: [77.5850, 13.0050],
          stepPolyline: [[77.5780, 13.0500], [77.5850, 13.0050]]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Proceed to Bowring Hospital',
          distance: 2500,
          duration: 300,
          startLocation: [77.5850, 13.0050],
          endLocation: [77.6033, 12.9833],
          stepPolyline: [[77.5850, 13.0050], [77.6033, 12.9833]]
        }
      ]
    }
  },

  // 5. Electronic City -> St John's Hospital (Koramangala/Sarjapur)
  {
    id: 'ECITY_STJOHNS',
    match: (orig, dest) =>
      Math.hypot(orig[0] - 77.6766, orig[1] - 12.8452) < 0.05 &&
      Math.hypot(dest[0] - 77.6200, dest[1] - 12.9315) < 0.04,
    fastest: {
      description: 'Via Hosur Road Elevated Expressway (Fastest)',
      coordinates: [
        [77.6766, 12.8452], // Electronic City Phase 1
        [77.6550, 12.8850], // Electronic City Toll Plaza
        [77.6350, 12.9100], // Bommanahalli / Silk Board Junction
        [77.6250, 12.9230], // Madiwala Market
        [77.6200, 12.9315]  // St John's Medical College Hospital
      ],
      distanceMeters: 12600,
      durationSeconds: 1200, // 20 min
      staticDurationSeconds: 1020,
      trafficDelaySeconds: 180,
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Enter Hosur Road Elevated Expressway heading north toward Silk Board',
          distance: 6800,
          duration: 540,
          startLocation: [77.6766, 12.8452],
          endLocation: [77.6550, 12.8850],
          stepPolyline: [[77.6766, 12.8452], [77.6550, 12.8850]]
        },
        {
          maneuver: 'CONTINUE',
          instruction: 'Descend Expressway toward Silk Board Flyover',
          distance: 3100,
          duration: 330,
          startLocation: [77.6550, 12.8850],
          endLocation: [77.6350, 12.9100],
          stepPolyline: [[77.6550, 12.8850], [77.6350, 12.9100]]
        },
        {
          maneuver: 'KEEP_LEFT',
          instruction: 'Keep left on Madiwala Underpass toward Sarjapur Main Road',
          distance: 1800,
          duration: 210,
          startLocation: [77.6350, 12.9100],
          endLocation: [77.6250, 12.9230],
          stepPolyline: [[77.6350, 12.9100], [77.6250, 12.9230]]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Arrive at St John’s Hospital Emergency Gate on the left',
          distance: 900,
          duration: 120,
          startLocation: [77.6250, 12.9230],
          endLocation: [77.6200, 12.9315],
          stepPolyline: [[77.6250, 12.9230], [77.6200, 12.9315]]
        }
      ]
    },
    shortest: {
      description: 'Via Begur Road & Hongasandra (Shortest Distance)',
      coordinates: [
        [77.6766, 12.8452],
        [77.6400, 12.8750],
        [77.6270, 12.9050],
        [77.6200, 12.9315]
      ],
      distanceMeters: 10900,
      durationSeconds: 1680, // 28 min
      staticDurationSeconds: 1100,
      trafficDelaySeconds: 580,
      steps: [
        {
          maneuver: 'DEPART',
          instruction: 'Head northwest on Bettadasanapura Main Rd toward Begur',
          distance: 4700,
          duration: 720,
          startLocation: [77.6766, 12.8452],
          endLocation: [77.6400, 12.8750],
          stepPolyline: [[77.6766, 12.8452], [77.6400, 12.8750]]
        },
        {
          maneuver: 'TURN_RIGHT',
          instruction: 'Turn right onto Begur Main Road',
          distance: 4100,
          duration: 650,
          startLocation: [77.6400, 12.8750],
          endLocation: [77.6270, 12.9050],
          stepPolyline: [[77.6400, 12.8750], [77.6270, 12.9050]]
        },
        {
          maneuver: 'ARRIVE',
          instruction: 'Arrive at St John’s Hospital',
          distance: 2100,
          duration: 310,
          startLocation: [77.6270, 12.9050],
          endLocation: [77.6200, 12.9315],
          stepPolyline: [[77.6270, 12.9050], [77.6200, 12.9315]]
        }
      ]
    }
  }
];

class MockRoutingProvider {
  /**
   * Generates a deterministic mock route between origin and destination
   * with realistic Bengaluru maneuvers and distinction between FASTEST and SHORTEST.
   *
   * @param {Object} origin GeoJSON Point
   * @param {Object} destination GeoJSON Point
   * @param {Object} options Additional routing options (preference: 'FASTEST'|'SHORTEST')
   * @returns {Promise<Object>} Normalized routing data
   */
  async getRoute(origin, destination, options = {}) {
    const origCoords = origin.coordinates;
    const destCoords = destination.coordinates;
    const preference = (options.preference || options.routingPreference || 'FASTEST').toUpperCase();

    // 1. Check if matches any canonical corridor
    for (const corridor of BENGALURU_CORRIDORS) {
      if (corridor.match(origCoords, destCoords)) {
        const selected = preference === 'SHORTEST' ? corridor.shortest : corridor.fastest;
        return {
          geometry: {
            type: 'LineString',
            coordinates: selected.coordinates
          },
          distanceMeters: selected.distanceMeters,
          durationSeconds: selected.durationSeconds,
          staticDurationSeconds: selected.staticDurationSeconds,
          trafficDelaySeconds: selected.trafficDelaySeconds,
          preference: preference === 'SHORTEST' ? 'SHORTEST' : 'FASTEST',
          description: selected.description,
          steps: selected.steps,
          provider: 'MOCK',
          retrievedAt: new Date().toISOString()
        };
      }
    }

    // 2. Real road routing: Call OSRM real road router to follow actual streets
    try {
      const realRoute = await osrmRoutingProvider.getRoute(origin, destination, options);
      return {
        ...realRoute,
        provider: 'MOCK_OSRM_ROADS',
        description: realRoute.description || (isShortest ? 'Shortest Drivable Road Route' : 'Fastest Drivable Arterial Corridor')
      };
    } catch (osrmErr) {
      console.error(`[MockRoutingProvider] OSRM real road router failed: ${osrmErr.message}`);
      throw new Error(`Unable to calculate road route: ${osrmErr.message}`);
    }
  }

  /**
   * Retrieves route with alternatives for mock provider
   */
  async getRouteWithAlternatives(origin, destination, options = {}) {
    for (const corridor of BENGALURU_CORRIDORS) {
      if (corridor.match(origin.coordinates, destination.coordinates)) {
        const primary = await this.getRoute(origin, destination, { ...options, preference: 'FASTEST' });
        const alt = await this.getRoute(origin, destination, { ...options, preference: 'SHORTEST' });
        return {
          primary,
          alternatives: [{ ...alt, isAlternative: true, candidateIndex: 1 }]
        };
      }
    }
    return await osrmRoutingProvider.getRouteWithAlternatives(origin, destination, options);
  }
}

export default new MockRoutingProvider();
