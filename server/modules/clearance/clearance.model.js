import mongoose from 'mongoose';

/**
 * Emergency Clearance Session Model (Demo V2X / Simulated Connected Vehicles)
 *
 * Persists simulated connected vehicle clearance interactions ahead of an active
 * emergency response ambulance along its travel corridor.
 *
 * Explicitly flagged as isSimulated: true to adhere to anti-fabrication standards.
 */

const connectedVehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      trim: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    },
    distanceToAmbulanceMeters: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: [
        'DETECTED',
        'ALERT_PENDING',
        'ALERT_SENT',
        'ACKNOWLEDGED',
        'GIVING_WAY',
        'CLEARED',
        'TIMEOUT',
        'UNAVAILABLE'
      ],
      default: 'DETECTED'
    },
    alertMessage: {
      type: String,
      default: 'Emergency vehicle approaching. Please give way.'
    },
    alertSentAt: {
      type: Date,
      default: null
    },
    acknowledgedAt: {
      type: Date,
      default: null
    },
    givingWayAt: {
      type: Date,
      default: null
    },
    clearedAt: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const clearanceSessionSchema = new mongoose.Schema(
  {
    clearanceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    emergency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Emergency',
      default: null
    },
    emergencyId: {
      type: String,
      default: null,
      trim: true
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null
    },
    vehicleId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null
    },
    routeId: {
      type: String,
      default: null,
      trim: true
    },
    isSimulated: {
      type: Boolean,
      default: true,
      required: true
    },
    simulationCorridor: {
      type: String,
      default: 'Bengaluru Arterial Corridor'
    },
    connectedVehicles: {
      type: [connectedVehicleSchema],
      default: []
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE'
    },
    summary: {
      totalDetected: { type: Number, default: 0 },
      totalAlerted: { type: Number, default: 0 },
      totalGivingWay: { type: Number, default: 0 },
      totalCleared: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

clearanceSessionSchema.index({ vehicleId: 1, createdAt: -1 });

export default mongoose.models.ClearanceSession ||
  mongoose.model('ClearanceSession', clearanceSessionSchema);
