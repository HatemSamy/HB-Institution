import jwt from 'jsonwebtoken';

import { log } from 'console';
import User from '../models/User.js';

// Protect routes
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Make sure token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id);
    console.log(req.user);
    
    next();
  } catch (error) {
    return res.status(401).json({

      message: 'Not authorized to access this route'
    });
  }
};

// Grant access to specific roles
export const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {

      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if user is blocked
export const checkBlocked = (req, res, next) => {
  if (req.user.isBlocked) {
    return res.status(403).json({
      success: false,
      message: 'Your account has been blocked. Please contact support.',
      blockedAt: req.user.blockedAt
    });
  }
  next();
};