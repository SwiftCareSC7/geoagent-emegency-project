import mongoose from 'mongoose';

/**
 * Decision Document
 *
 * Stores a single operational decision produced by the deterministic Decision Engine,
 * reconciled against the GeoAgent advisory recommendation.
 *
 * Decisions are intentionally NOT auto-executing. A decision begins in
 * PENDING_OPERATOR_ACTION and requires an explicit ADMIN or CONTROL_ROOM operator
 * approval to transition to APPROVED -> EXECUTED.
 */

const decisionSchema = new mongoose.Schema(
  {
    decisionId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true
    },

    emergency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Emergency',
      required: true
    },

    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null
    },

    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null
    },

    severity: {
      type: String,
      enum: ['NORMAL', 'WARNING', 'CRITICAL'],
      required: true
    },

    actions: {
      type: [String],
      enum: ['CONTINUE', 'REROUTE', 'CONSIDER_BACKUP', 'ALERT_CONTROL_ROOM', 'NO_ACTION'],
      default: []
    },

    primaryAction: {
      type: String,
      enum: ['CONTINUE', 'REROUTE', 'CONSIDER_BACKUP', 'ALERT_CONTROL_ROOM', 'NO_ACTION'],
      required: true
    },

    backup: {
      recommended: { type: Boolean, default: false },
      candidateVehicleId: { type: String, default: null },
      backupEtaMinutes: { type: Number, default: null },
      currentEtaMinutes: { type: Number, default: null }
    },

    reasonCodes: {
      type: [String],
      default: []
    },

    geoAgentRecommendation: {
      action: { type: String, default: null },
      confidence: { type: Number, default: null },
      fallback: { type: Boolean, default: false }
    },

    /**
     * Compact operational snapshot — enough to audit "why this decision was made"
     * without duplicating full MongoDB documents.
     */
    inputSnapshot: {
      emergencyPriority: { type: String, default: null },
      emergencyStatus: { type: String, default: null },
      vehicleStatus: { type: String, default: null },
      routeStatus: { type: String, default: null },
      deviationStatus: { type: String, default: null },
      deviationDistanceMeters: { type: Number, default: null },
      trafficLevel: { type: String, default: null },
      currentEtaMinutes: { type: Number, default: null },
      originalEtaMinutes: { type: Number, default: null },
      delayMinutes: { type: Number, default: null },
      correlatedIncidentIds: { type: [String], default: [] },
      alternativeRoutesConsidered: { type: Number, default: 0 }
    },

    /**
     * Idempotency hash. Decisions generated from identical operational state share this hash.
     */
    situationHash: {
      type: String,
      required: true,
      index: true
    },

    status: {
      type: String,
      enum: ['PENDING_OPERATOR_ACTION', 'APPROVED', 'REJECTED', 'EXECUTED', 'CANCELLED'],
      default: 'PENDING_OPERATOR_ACTION',
      index: true
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    approvedAt: {
      type: Date,
      default: null
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    rejectedAt: {
      type: Date,
      default: null
    },

    rejectionReason: {
      type: String,
      default: null
    },

    executedAt: {
      type: Date,
      default: null
    },

    executionSummary: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Idempotency / lookup indexes
decisionSchema.index({ emergency: 1, createdAt: -1 });
decisionSchema.index({ emergency: 1, situationHash: 1 });
decisionSchema.index({ status: 1, createdAt: -1 });

decisionSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

const Decision = mongoose.model('Decision', decisionSchema);

export default Decision;