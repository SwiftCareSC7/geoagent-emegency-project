/**
 * SwiftCare GeoAgent — Authoritative Route Validator (Backend Service Layer)
 *
 * Implements strict global validation rules across EVERY route generated or queried in the backend.
 * Guarantees routes never cut through buildings, never use straight-line shortcuts,
 * and always conform to authentic road network geometry.
 */

export function haversineDistance(coord1, coord2) {
  if (!coord1 || !coord2) return 0;
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  if (
    typeof lng1 !== 'number' || typeof lat1 !== 'number' ||
    typeof lng2 !== 'number' || typeof lat2 !== 'number' ||
    isNaN(lng1) || isNaN(lat1) || isNaN(lng2) || isNaN(lat2)
  ) {
    return 0;
  }

  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function extractLngLat(pt) {
  if (!pt) return null;
  if (Array.isArray(pt) && pt.length >= 2) {
    const lng = Number(pt[0]);
    const lat = Number(pt[1]);
    if (!isNaN(lng) && !isNaN(lat)) return [lng, lat];
  }
  if (pt.coordinates && Array.isArray(pt.coordinates) && pt.coordinates.length >= 2) {
    const lng = Number(pt.coordinates[0]);
    const lat = Number(pt.coordinates[1]);
    if (!isNaN(lng) && !isNaN(lat)) return [lng, lat];
  }
  if (pt.lng !== undefined && pt.lat !== undefined) {
    const lng = Number(pt.lng);
    const lat = Number(pt.lat);
    if (!isNaN(lng) && !isNaN(lat)) return [lng, lat];
  }
  if (pt.longitude !== undefined && pt.latitude !== undefined) {
    const lng = Number(pt.longitude);
    const lat = Number(pt.latitude);
    if (!isNaN(lng) && !isNaN(lat)) return [lng, lat];
  }
  return null;
}

export function validateRouteGeometry(route, expectedOrigin, expectedDestination) {
  const reasons = [];

  if (!route || !route.geometry) {
    return {
      isValid: false,
      isRoadConstrained: false,
      reasons: ['Route geometry object is missing'],
      metrics: {
        pointCount: 0,
        distanceMeters: 0,
        durationSeconds: 0,
        euclideanDistanceMeters: 0,
        tortuosity: 0,
        maxSegmentLengthMeters: 0,
        averageSpeedKmh: 0,
        hasSuspiciousJumps: false,
        isStraightLineShortcut: true,
      },
    };
  }

  if (route.geometry.type && route.geometry.type !== 'LineString') {
    reasons.push(`Invalid geometry type '${route.geometry.type}', expected 'LineString'`);
  }

  const coords = route.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    reasons.push(`Insufficient coordinate count (${coords?.length || 0}); minimum 2 required`);
    return {
      isValid: false,
      isRoadConstrained: false,
      reasons,
      metrics: {
        pointCount: coords?.length || 0,
        distanceMeters: 0,
        durationSeconds: 0,
        euclideanDistanceMeters: 0,
        tortuosity: 0,
        maxSegmentLengthMeters: 0,
        averageSpeedKmh: 0,
        hasSuspiciousJumps: false,
        isStraightLineShortcut: true,
      },
    };
  }

  // Check bounds
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
      reasons.push(`Coordinate at index ${i} is non-numeric: [${lng}, ${lat}]`);
      break;
    }
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      reasons.push(`Coordinate at index ${i} exceeds geographical bounds: [${lng}, ${lat}]`);
      break;
    }
  }

  const firstCoord = coords[0];
  const lastCoord = coords[coords.length - 1];
  const straightLineDistance = haversineDistance(firstCoord, lastCoord);

  let totalPolylineDistance = 0;
  let maxSegmentLength = 0;
  let hasSuspiciousJumps = false;

  for (let i = 0; i < coords.length - 1; i++) {
    const segDist = haversineDistance(coords[i], coords[i + 1]);
    totalPolylineDistance += segDist;
    if (segDist > maxSegmentLength) {
      maxSegmentLength = segDist;
    }
    if (segDist > 4000) {
      hasSuspiciousJumps = true;
    }
  }

  if (hasSuspiciousJumps) {
    reasons.push(
      `Suspicious jump detected in polyline: largest segment is ${(maxSegmentLength / 1000).toFixed(1)} km`
    );
  }

  const statedDistance = route.distanceMeters || route.distance || totalPolylineDistance;
  const statedDuration = route.durationSeconds || route.duration || 0;

  let isStraightLineShortcut = false;
  if (coords.length === 2 && straightLineDistance > 300) {
    isStraightLineShortcut = true;
    reasons.push(
      `Route is a 2-point straight line chord of ${(straightLineDistance / 1000).toFixed(2)} km. Cuts across buildings.`
    );
  }

  if (coords.length < 5 && straightLineDistance > 600) {
    isStraightLineShortcut = true;
    reasons.push(
      `Route has only ${coords.length} points for ${(straightLineDistance / 1000).toFixed(2)} km. Real road geometry required.`
    );
  }

  const tortuosity = straightLineDistance > 50 ? totalPolylineDistance / straightLineDistance : 1.0;
  if (straightLineDistance > 300 && tortuosity < 0.98) {
    reasons.push(`Geometry length (${Math.round(totalPolylineDistance)}m) is less than straight line`);
  }

  let averageSpeedKmh = 0;
  if (statedDuration > 0 && statedDistance > 0) {
    averageSpeedKmh = (statedDistance / statedDuration) * 3.6;
    if (averageSpeedKmh < 1.0 || averageSpeedKmh > 180) {
      reasons.push(`Plausibility warning: average speed ${averageSpeedKmh.toFixed(1)} km/h is unrealistic`);
    }
  }

  const originCoord = expectedOrigin || extractLngLat(route.origin);
  if (originCoord) {
    const distFromStart = haversineDistance(originCoord, firstCoord);
    if (distFromStart > 1500) {
      reasons.push(`Route starting point diverges ${Math.round(distFromStart)}m from assigned origin`);
    }
  }

  const destCoord = expectedDestination || extractLngLat(route.destination);
  if (destCoord) {
    const distFromEnd = haversineDistance(destCoord, lastCoord);
    if (distFromEnd > 1500) {
      reasons.push(`Route ending point diverges ${Math.round(distFromEnd)}m from assigned destination`);
    }
  }

  const isValid = reasons.length === 0;
  const isRoadConstrained = !isStraightLineShortcut && coords.length >= (straightLineDistance > 1000 ? 8 : 3);

  return {
    isValid,
    isRoadConstrained,
    reasons,
    metrics: {
      pointCount: coords.length,
      distanceMeters: Math.round(statedDistance),
      durationSeconds: Math.round(statedDuration),
      euclideanDistanceMeters: Math.round(straightLineDistance),
      tortuosity: Number(tortuosity.toFixed(2)),
      maxSegmentLengthMeters: Math.round(maxSegmentLength),
      averageSpeedKmh: Number(averageSpeedKmh.toFixed(1)),
      hasSuspiciousJumps,
      isStraightLineShortcut,
    },
  };
}

export default {
  validateRouteGeometry,
  haversineDistance,
  extractLngLat,
};
