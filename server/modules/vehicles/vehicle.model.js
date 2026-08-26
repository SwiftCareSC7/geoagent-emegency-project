import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      unique: true,
      immutable: true, // Cannot be changed after creation
      trim: true
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: ['AMBULANCE', 'FIRE_ENGINE', 'POLICE'],
      required: true
    },
    status: {
      type: String,
      enum: [
        'AVAILABLE',
        'DISPATCHED',
        'EN_ROUTE',
        'AT_SCENE',
        'RETURNING',
        'OFFLINE',
        'MAINTENANCE'
      ],
      default: 'AVAILABLE'
    },
    driverName: {
      type: String,
      required: true,
      trim: true
    },
    driverContact: {
      type: String,
      trim: true
    },
    hospitalName: {
      type: String,
      trim: true
    },
    hospitalCode: {
      type: String,
      trim: true
    },
    capacity: {
      type: Number,
      required: true,
      min: [1, 'Capacity must be a positive integer']
    }
  },
  {
    timestamps: true
  }
);

// Method to return a safe version of the vehicle object
vehicleSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  
  // Convert _id to id for consistency
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  
  return obj;
};

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;
