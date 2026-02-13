const rateLimit = require('express-rate-limit');

// API rate limiter - Per IP address
// For production: Consider if students share IPs (school/office networks)
const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 10000 : 5000, // Much higher for shared IPs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/health') || req.path.startsWith('/metrics'),
});

// Authentication rate limiter - 300 requests per hour per IP
// Increased for shared IPs in schools/offices
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 300, // Allows multiple students from same IP to login
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after some time.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Test submission rate limiter - Per IP address
// Increased for multiple students from same network
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5000, // Allows many students from same IP to save progress
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Proctoring frame rate limiter - 5 frames per second per IP
// Increased to handle multiple students from same network
// Each student sends ~5 frames/sec, so this allows 1 student per IP per second
const proctoringLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 500, // Allows 100 students at 5 fps from same IP
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
