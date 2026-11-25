import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true
  }
}, { _id: false });

const trajectorySchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true
    },
    location: {
      type: pointSchema,
      required: true
    },
    mapMatchedLocation: {
      type: pointSchema
    },
    mapMatchDistanceMeters: {
      type: Number,
      min: 0
    },
    speed: {
      type: Number,
      required: true,
      min: 0,
      max: 250 // reasonable maximum km/h for a ground vehicle
    },
    heading: {
      type: Number,
      required: true,
      min: 0,
      max: 360
    },
    timestamp: {
      type: Date,
      required: true
    },
    source: {
      type: String,
      enum: ['SIMULATOR', 'DEVICE', 'API'],
      default: 'SIMULATOR'
    }
  },
  {
    timestamps: true // adds createdAt, updatedAt
  }
);

// Indexes for high performance
// 1. Compound index for retrieving the latest/recent trajectory of a specific vehicle efficiently
trajectorySchema.index({ vehicle: 1, timestamp: -1 });

// 2. Geospatial index for future proximity/deviation queries
trajectorySchema.index({ location: '2dsphere' });

// 3. Configurable retention TTL index for routine telemetry breadcrumbs (default 90 days)
// Operational audit records and critical mission states are protected
const retentionDays = parseInt(process.env.TELEMETRY_RETENTION_DAYS || '90', 10);
if (retentionDays > 0) {
  trajectorySchema.index(
    { timestamp: 1 },
    {
      expireAfterSeconds: retentionDays * 24 * 60 * 60,
      partialFilterExpression: { source: { $in: ['SIMULATOR', 'DEVICE', 'API'] } }
    }
  );
}

// Method to return a safe version of the trajectory object
trajectorySchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  
  // Convert _id to id for consistency
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  
  return obj;
};

const Trajectory = mongoose.model('Trajectory', trajectorySchema);

const isValidCoordPair = (pair) =>
  Array.isArray(pair) &&
  pair.length >= 2 &&
  typeof pair[0] === 'number' &&
  typeof pair[1] === 'number' &&
  Number.isFinite(pair[0]) &&
  Number.isFinite(pair[1]);

const computeInitialHeading = (coords) => {
  if (!Array.isArray(coords) || coords.length < 2) return 0;
  const start = coords[0];
  const next = coords.find((pt, idx) => idx > 0 && isValidCoordPair(pt) && (pt[0] !== start[0] || pt[1] !== start[1]));
  if (!isValidCoordPair(start) || !next) return 0;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLng = toRad(next[0] - start[0]);
  const lat1 = toRad(start[1]);
  const lat2 = toRad(next[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return Math.round(((Math.atan2(y, x) * 180) / Math.PI + 360) % 360);
};

/**
 * Build an in-memory baseline trajectory when a vehicle has no persisted GPS pings yet
 * (e.g. newly dispatched unit or expired telemetry TTL), preventing 404 errors in analysis/prediction.
 */
export function buildFallbackTrajectory(vehicle, route = null) {
  const candidates = [
    route?.origin?.coordinates,
    route?.geometry?.coordinates?.[0],
    route?.emergencyLocation?.coordinates,
    vehicle?.currentLocation?.coordinates
  ];
  const coords = candidates.find(isValidCoordPair) || [77.6245, 12.9352];
  const routeSpeed =
    route && route.distance > 0 && route.duration > 0
      ? Math.min(60, Math.max(20, Math.round((route.distance / route.duration) * 3.6)))
      : 35;
  const speed =
    typeof vehicle?.speed === 'number' && Number.isFinite(vehicle.speed) && vehicle.speed > 0
      ? vehicle.speed
      : routeSpeed;

  return {
    vehicle: vehicle?._id || null,
    location: { type: 'Point', coordinates: [coords[0], coords[1]] },
    speed,
    heading: computeInitialHeading(route?.geometry?.coordinates),
    timestamp: new Date(),
    source: 'SIMULATOR',
    isSyntheticFallback: true
  };
}

export default Trajectory;
