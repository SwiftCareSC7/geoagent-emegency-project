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

export default Trajectory;
