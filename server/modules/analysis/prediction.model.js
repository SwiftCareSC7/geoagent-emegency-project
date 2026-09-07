/**
 * Prediction Snapshot Model
 *
 * Persists meaningful predictions for operational explainability, audit trails,
 * and post-incident reviews.
 */

import mongoose from 'mongoose';

const factorSchema = new mongoose.Schema(
  {
    factor: { type: String, required: true },
    impact: { type: String, required: true },
    epistemicType: {
      type: String,
      enum: ['OBSERVED', 'DERIVED', 'INFERRED', 'UNKNOWN'],
      required: true
    }
  },
  { _id: false }
);

const predictionSchema = new mongoose.Schema(
  {
    emergency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Emergency',
      required: false
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: false
    },
    predictedEta: {
      type: Date,
      required: true
    },
    baselineEta: {
      type: Date,
      required: true
    },
    predictedDurationSeconds: {
      type: Number,
      required: true
    },
    baselineDurationSeconds: {
      type: Number,
      required: true
    },
    predictedDelaySeconds: {
      type: Number,
      required: true,
      default: 0
    },
    predictedDelayMinutes: {
      type: Number,
      required: true,
      default: 0
    },
    delayRisk: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true
    },
    routeRisk: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true
    },
    confidence: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'],
      required: true
    },
    confidenceScore: {
      type: Number, // 0.0 - 1.0
      min: 0,
      max: 1
    },
    rerouteAdvised: {
      type: Boolean,
      default: false
    },
    rerouteUrgency: {
      type: String,
      enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'IMMEDIATE'],
      default: 'NONE'
    },
    factors: [factorSchema],
    inputsSummary: {
      type: mongoose.Schema.Types.Mixed
    },
    modelVersion: {
      type: String,
      default: 'v1.2-exponential-traffic-blend'
    },
    trafficSource: {
      type: String,
      default: 'UNKNOWN'
    }
  },
  {
    timestamps: true
  }
);

// Indexes
predictionSchema.index({ vehicle: 1, createdAt: -1 });
predictionSchema.index({ emergency: 1, createdAt: -1 });
predictionSchema.index({ delayRisk: 1 });

predictionSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

const Prediction = mongoose.model('Prediction', predictionSchema);

export default Prediction;
