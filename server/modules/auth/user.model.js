import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['CONTROL_ROOM', 'ADMIN', 'DRIVER', 'PARAMEDIC'],
      default: 'CONTROL_ROOM'
    },
    requestedRole: {
      type: String,
      enum: ['CONTROL_ROOM', 'DRIVER', 'PARAMEDIC', 'ADMIN'],
      default: 'CONTROL_ROOM'
    },
    requestedWorkspaces: {
      type: [String],
      default: ['CONTROL_ROOM']
    },
    permittedWorkspaces: {
      type: [String],
      enum: ['ADMIN', 'CONTROL_ROOM', 'DRIVER', 'PARAMEDIC'],
      default: ['CONTROL_ROOM']
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'SUSPENDED'],
      default: 'PENDING'
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
    assignedVehicleId: {
      type: String,
      default: null,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for administrative listings and sorting
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ status: 1, role: 1 });

// We don't hash password in a pre-save hook here to keep auth business logic in authService
// But we can add a method to return a safe user object (without password)
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  // Convert _id to id for consistency
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  // Backward compatibility: existing accounts without status default to APPROVED
  if (!obj.status) {
    obj.status = 'APPROVED';
  }
  // Authoritative fallback for permitted workspaces
  if (!obj.permittedWorkspaces || obj.permittedWorkspaces.length === 0) {
    if (obj.role === 'ADMIN') {
      obj.permittedWorkspaces = ['ADMIN', 'CONTROL_ROOM', 'DRIVER', 'PARAMEDIC'];
    } else if (obj.role === 'CONTROL_ROOM') {
      obj.permittedWorkspaces = ['CONTROL_ROOM', 'DRIVER'];
    } else if (obj.role === 'DRIVER') {
      obj.permittedWorkspaces = ['DRIVER'];
    } else if (obj.role === 'PARAMEDIC') {
      obj.permittedWorkspaces = ['PARAMEDIC'];
    } else {
      obj.permittedWorkspaces = ['CONTROL_ROOM'];
    }
  }
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
