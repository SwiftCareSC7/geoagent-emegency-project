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

const incidentSchema = new mongoose.Schema(
  {
    incidentId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['ACCIDENT', 'ROAD_CLOSURE', 'ROAD_WORK', 'TRAFFIC_JAM', 'FIRE', 'WEATHER', 'PUBLIC_EVENT', 'OTHER'],
      required: true
    },
    severity: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'MEDIUM'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED', 'DISMISSED'],
      default: 'ACTIVE'
    },
    description: {
      type: String,
      trim: true
    },
    location: {
      type: pointSchema,
      required: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emergency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Emergency',
      default: null
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Indexes for operational queries
incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ emergency: 1, isDeleted: 1 });
incidentSchema.index({ status: 1, isDeleted: 1 });


// Method to return a safe version of the incident object
incidentSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  
  // Convert _id to id for consistency
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  
  return obj;
};

const Incident = mongoose.model('Incident', incidentSchema);

export default Incident;
