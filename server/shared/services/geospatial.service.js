import * as turf from '@turf/turf';

/**
 * Validates coordinate ranges
 * @param {Array} coordinates [longitude, latitude]
 * @returns {Boolean}
 */
export const validateCoordinates = (coordinates) => {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return false;
  const [lng, lat] = coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') return false;
  if (lng < -180 || lng > 180) return false;
  if (lat < -90 || lat > 90) return false;
  return true;
};

/**
 * Creates a GeoJSON Point
 * @param {Number} lng Longitude
 * @param {Number} lat Latitude
 * @returns {Object} GeoJSON Point
 */
export const createPoint = (lng, lat) => {
  if (!validateCoordinates([lng, lat])) {
    throw new Error('Invalid coordinates for point creation');
  }
  return {
    type: 'Point',
    coordinates: [lng, lat]
  };
};

/**
 * Calculates straight line distance between two GeoJSON points
 * @param {Object} point1 GeoJSON Point
 * @param {Object} point2 GeoJSON Point
 * @returns {Object} { meters, kilometers }
 */
export const calculateDistance = (point1, point2) => {
  const p1 = turf.point(point1.coordinates);
  const p2 = turf.point(point2.coordinates);
  
  const distanceKm = turf.distance(p1, p2, { units: 'kilometers' });
  return {
    kilometers: Number(distanceKm.toFixed(3)),
    meters: Number((distanceKm * 1000).toFixed(1))
  };
};

/**
 * Calculates the shortest distance from a point to a LineString route
 * @param {Object} point GeoJSON Point
 * @param {Object} lineString GeoJSON LineString
 * @returns {Number} Distance in meters
 */
export const distanceToRoute = (point, lineString) => {
  const pt = turf.point(point.coordinates);
  const line = turf.lineString(lineString.coordinates);
  
  const distanceKm = turf.pointToLineDistance(pt, line, { units: 'kilometers' });
  return Number((distanceKm * 1000).toFixed(1)); // Convert to meters
};

/**
 * Finds the nearest point on a route to a given point
 * @param {Object} point GeoJSON Point
 * @param {Object} lineString GeoJSON LineString
 * @returns {Object} { nearestPoint: GeoJSON Point, distanceMeters: Number }
 */
export const nearestPointOnRoute = (point, lineString) => {
  const pt = turf.point(point.coordinates);
  const line = turf.lineString(lineString.coordinates);
  
  const nearest = turf.nearestPointOnLine(line, pt, { units: 'kilometers' });
  
  return {
    nearestPoint: {
      type: 'Point',
      coordinates: nearest.geometry.coordinates
    },
    distanceMeters: Number((nearest.properties.dist * 1000).toFixed(1))
  };
};

/**
 * Calculates approximate bearing from point1 to point2
 * @param {Object} point1 GeoJSON Point
 * @param {Object} point2 GeoJSON Point
 * @returns {Number} Bearing in degrees (0-360)
 */
export const calculateBearing = (point1, point2) => {
  const p1 = turf.point(point1.coordinates);
  const p2 = turf.point(point2.coordinates);
  
  let bearing = turf.bearing(p1, p2);
  // turf.bearing returns -180 to 180. Convert to 0-360.
  if (bearing < 0) {
    bearing = 360 + bearing;
  }
  return Number(bearing.toFixed(2));
};

/**
 * Calculates the total length of a route
 * @param {Object} lineString GeoJSON LineString
 * @returns {Object} { meters, kilometers }
 */
export const calculateRouteLength = (lineString) => {
  const line = turf.lineString(lineString.coordinates);
  const lengthKm = turf.length(line, { units: 'kilometers' });
  
  return {
    kilometers: Number(lengthKm.toFixed(3)),
    meters: Number((lengthKm * 1000).toFixed(1))
  };
};

/**
 * Calculates progress of a point along a LineString route
 * @param {Object} point GeoJSON Point
 * @param {Object} lineString GeoJSON LineString
 * @returns {Object} { progressPercentage, distanceAlongRouteMeters, remainingDistanceMeters, totalRouteDistanceMeters }
 */
export const calculateRouteProgress = (point, lineString) => {
  const pt = turf.point(point.coordinates);
  const line = turf.lineString(lineString.coordinates);

  const totalLengthKm = turf.length(line, { units: 'kilometers' });
  const nearest = turf.nearestPointOnLine(line, pt, { units: 'kilometers' });
  const distanceAlongKm = nearest.properties.location || 0;

  const totalMeters = Number((totalLengthKm * 1000).toFixed(1));
  const distanceAlongMeters = Number((distanceAlongKm * 1000).toFixed(1));
  const remainingMeters = Math.max(0, Number((totalMeters - distanceAlongMeters).toFixed(1)));
  const progressPercentage = totalMeters > 0 
    ? Math.min(100, Math.max(0, Number(((distanceAlongMeters / totalMeters) * 100).toFixed(1))))
    : 0;

  return {
    progressPercentage,
    distanceAlongRouteMeters: distanceAlongMeters,
    remainingDistanceMeters: remainingMeters,
    totalRouteDistanceMeters: totalMeters
  };
};

/**
 * Calculates the forward route bearing (in degrees 0-360) at the route segment closest to the given point
 * @param {Object} lineString GeoJSON LineString
 * @param {Object} point GeoJSON Point
 * @returns {Number} Bearing in degrees (0-360)
 */
export const getRouteBearingAtPoint = (lineString, point) => {
  const coords = lineString.coordinates;
  if (!coords || coords.length < 2) {
    return 0;
  }

  const pt = turf.point(point.coordinates);
  const line = turf.lineString(coords);
  const nearest = turf.nearestPointOnLine(line, pt, { units: 'kilometers' });
  
  let segIndex = typeof nearest.properties.index === 'number' ? nearest.properties.index : 0;
  if (segIndex >= coords.length - 1) {
    segIndex = coords.length - 2;
  }

  const p1 = createPoint(coords[segIndex][0], coords[segIndex][1]);
  const p2 = createPoint(coords[segIndex + 1][0], coords[segIndex + 1][1]);

  return calculateBearing(p1, p2);
};

