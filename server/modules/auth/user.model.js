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
      enum: ['CONTROL_ROOM', 'ADMIN'],
      default: 'CONTROL_ROOM'
    }
  },
  {
    timestamps: true
  }
);

// We don't hash password in a pre-save hook here to keep auth business logic in authService
// But we can add a method to return a safe user object (without password)
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  // Convert _id to id for consistency
  obj.id = obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', userSchema);

export default User;
