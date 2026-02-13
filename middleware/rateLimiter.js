const rateLimit = require('express-rate-limit');

// 1000 requests per hour per IP (increased to handle exam + navigation)
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Handles auto-save + navigation + other exam functions
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/health') || req.path.startsWith('/metrics'),
});

// Authentication rate limiter - 150 requests per hour
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 150, // Sufficient for login attempts and session refreshes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after some time.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Test submission rate limiter - 1000 requests per hour
// Handles progress saves (every 30 seconds) + final submission + retries
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Allows 120 auto-saves + navigation + submission attempts
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Proctoring frame rate limiter - 3 frames per second per student
// NOTE: This is separate from hourly limits - proctoring data is handled independently
const proctoringLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 3,
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
