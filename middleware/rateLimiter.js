const rateLimit = require('express-rate-limit');

// General API rate limiter - Optimized for exam functionality
// 300 requests per 15 minutes per IP (increased from 100)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased to handle exam operations
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/health') || req.path.startsWith('/metrics'),
});

// Strict rate limiter for authentication endpoints - 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to allow retries
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Test submission rate limiter - Optimized for multiple attempts
// 20 submissions per hour (increased from 10)
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Increased to allow progress saves + final submission
  message: {
    success: false,
    message: 'Too many test submissions, please contact administrator.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Proctoring frame rate limiter - 3 frames per second per student
// Reduced from 5 to save bandwidth
const proctoringLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 3, // Reduced from 5 to save bandwidth
  message: {
    success: false,
    message: 'Frame rate exceeded, please reduce proctoring frame rate.',
  },
  standardHeaders: false,
  legacyHeaders: false,
  skipFailedRequests: true,
});

module.exports = {
  apiLimiter,
  authLimiter,
  submissionLimiter,
  proctoringLimiter,
};
