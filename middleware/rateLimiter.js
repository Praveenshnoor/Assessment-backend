const rateLimit = require('express-rate-limit');

// API rate limiter - Per IP address
// For production: Supports up to 200 students from same IP
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 20000 : 5000, // 200 students × 100 requests
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/health') || req.path.startsWith('/metrics'),
});

// Authentication rate limiter - Per IP address
// Supports up to 200 students from same network
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // 200 students × 2-3 auth requests each
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after some time.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Test submission rate limiter - Per IP address
// Supports up to 200 students from same network
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10000, // 200 students × 50 progress saves each
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Proctoring frame rate limiter - Per IP per second
// Supports up to 200 students at 5 fps from same network
const proctoringLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 1000, // 200 students × 5 frames/sec
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
