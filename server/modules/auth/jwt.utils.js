import jwt from 'jsonwebtoken';

/**
 * Generate a JWT token for a user
 * @param {String} userId 
 * @param {String} role 
 * @returns {String} token
 */
export const generateToken = (userId, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing from environment variables');
  }

  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Verify a JWT token securely
 * @param {String} token 
 * @returns {Object} decoded payload
 */
export const verifyToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing from environment variables');
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};
