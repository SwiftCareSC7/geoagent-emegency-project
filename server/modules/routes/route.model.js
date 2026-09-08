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

const lineStringSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['LineString'],
    required: true
  },
  coordinates: {
    type: [[Number]], // Array of [longitude, latitude] arrays
    required: true
  }
}, { _id: false });

const routeLegSchema = new mongoose.Schema({
  legNumber: { type: Number, required: true },
  type: {
    type: String,
    enum: ['TO_EMERGENCY', 'TO_HOSPITAL'],
    required: true
  },
  title: { type: String },
  originName: { type: String },
  destinationName: { type: String },
  origin: { type: pointSchema, required: true },
  destination: { type: pointSchema, required: true },
  geometry: { type: lineStringSchema, required: true },
  distance: { type: Number, required: true, min: 0 },
  duration: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['ACTIVE', 'PLANNED', 'COMPLETED'],
    default: 'PLANNED'
  },
  trafficDelay: { type: Number, default: 0 },
  steps: [
    {
      maneuver: { type: String, default: 'CONTINUE' },
      instruction: { type: String, required: true },
      distance: { type: Number, default: 0 },
      duration: { type: Number, default: 0 },
      startLocation: { type: [Number] },
      endLocation: { type: [Number] },
      stepPolyline: { type: [[Number]] }
    }
  ]
}, { _id: false });

const routeSchema = new mongoose.Schema(
  {
    routeId: {
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
      required: true
    },
    origin: {
      type: pointSchema,
      required: true
    },
    destination: {
      type: pointSchema,
      required: true
    },
    emergencyLocation: {
      type: pointSchema
    },
    hospitalLocation: {
      type: pointSchema
    },
    legs: [routeLegSchema],
    activeLegIndex: {
      type: Number,
      default: 0
    },
    geometry: {
      type: lineStringSchema,
      required: true
    },
    distance: {
      type: Number, // meters
      required: true,
      min: 0
    },
    duration: {
      type: Number, // seconds
      required: true,
      min: 0
    },
    provider: {
      type: String,
      enum: ['MOCK', 'GOOGLE', 'MAPBOX', 'OSRM'],
      required: true
    },
    routeType: {
      type: String,
      enum: ['PLANNED', 'ALTERNATIVE', 'CURRENT', 'RECOMMENDED', 'HISTORICAL'],
      default: 'PLANNED'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'],
      default: 'ACTIVE'
    },
    preference: {
      type: String,
      enum: ['FASTEST', 'SHORTEST'],
      default: 'FASTEST'
    },
    steps: [
      {
        maneuver: {
          type: String,
          enum: [
            'DEPART',
            'TURN_LEFT',
            'TURN_RIGHT',
            'CONTINUE',
            'KEEP_RIGHT',
            'KEEP_LEFT',
            'U_TURN',
            'ARRIVE'
          ],
          default: 'CONTINUE'
        },
        instruction: {
          type: String,
          required: true
        },
        distance: {
          type: Number,
          default: 0
        },
        duration: {
          type: Number,
          default: 0
        },
        startLocation: {
          type: [Number]
        },
        endLocation: {
          type: [Number]
        },
        stepPolyline: {
          type: [[Number]]
        }
      }
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
routeSchema.index({ emergency: 1, routeType: 1 });
routeSchema.index({ vehicle: 1, status: 1 });
routeSchema.index({ geometry: '2dsphere' });
routeSchema.index({ origin: '2dsphere' });
routeSchema.index({ destination: '2dsphere' });
routeSchema.index({ createdAt: -1 });

// Safe object representation
routeSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

const Route = mongoose.model('Route', routeSchema);

export default Route;
