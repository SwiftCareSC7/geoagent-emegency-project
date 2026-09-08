import { registerUser, loginUser } from './auth.service.js';
import { generateToken } from './jwt.utils.js';

// Configuration for HTTP-only cookie
// In production, frontend (Vercel) and backend (Cloud Run) are on different domains,
// so SameSite=None + Secure is required for cross-origin credentials: 'include'.
const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  };
};

/**
 * Handle user registration
 */
export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);
    
    // We do not log the user in immediately per the requirements
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const user = await loginUser(email, password);
    
    // Generate JWT
    const token = generateToken(user._id, user.role);
    
    // Set HTTP-only cookie
    res.cookie('token', token, getCookieOptions());
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: user.toSafeObject()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user logout
 */
export const logout = (req, res) => {
  res.clearCookie('token', getCookieOptions());
  
  res.status(200).json({
    success: true,
    message: 'Logout successful'
  });
};

/**
 * Get current authenticated user
 */
export const getMe = async (req, res) => {
  // req.user is populated by the authMiddleware
  res.status(200).json({
    success: true,
    user: req.user.toSafeObject()
  });
};
