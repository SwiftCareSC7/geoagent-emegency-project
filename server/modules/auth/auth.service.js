import bcrypt from 'bcryptjs';
import User from './user.model.js';

/**
 * Register a new user securely
 */
export const registerUser = async (userData) => {
  const { name, email, password } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error('Email is already registered');
    error.status = 409;
    error.isOperational = true;
    throw error;
  }

  // Hash password
  const salt = await bcrypt.genSalt(12); // High work factor
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  // We explicitly ignore any 'role' field passed in to prevent privilege escalation
  const newUser = new User({
    name,
    email,
    password: hashedPassword,
    role: 'CONTROL_ROOM' // Hardcoded for public registration
  });

  await newUser.save();

  return newUser;
};

/**
 * Authenticate a user
 */
export const loginUser = async (email, password) => {
  // Find user by email
  const user = await User.findOne({ email });
  
  if (!user) {
    // We throw a generic error to prevent email enumeration
    const error = new Error('Invalid email or password');
    error.status = 401;
    error.isOperational = true;
    throw error;
  }

  // Compare passwords securely
  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    error.isOperational = true;
    throw error;
  }

  return user;
};
