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

const emergencySchema = new mongoose.Schema(
  {
    emergencyId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['MEDICAL', 'ACCIDENT', 'FIRE', 'POLICE', 'OTHER'],
      required: true
    },
    priority: {
      type: String,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      default: 'HIGH'
    },
    status: {
      type: String,
      enum: ['PENDING', 'DISPATCHED', 'IN_PROGRESS', 'AT_SCENE', 'RESOLVED', 'CANCELLED'],
      default: 'PENDING'
    },
    callerName: {
      type: String,
      trim: true
    },
    callerContact: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    location: {
      type: pointSchema,
      required: true
    },
    destination: {
      type: pointSchema
    },
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
emergencySchema.index({ location: '2dsphere' });
emergencySchema.index({ destination: '2dsphere' });
emergencySchema.index({ assignedVehicle: 1, isDeleted: 1 });
emergencySchema.index({ status: 1, isDeleted: 1 });


// Method to return a safe version of the emergency object
emergencySchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  
  // Convert _id to id for consistency
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  
  // Optionally omit callerContact if we wanted to enforce strictly on object conversion, 
  // but it's often better to let the service/controller decide based on the user's role.
  
  return obj;
};

const Emergency = mongoose.model('Emergency', emergencySchema);

export default Emergency;
