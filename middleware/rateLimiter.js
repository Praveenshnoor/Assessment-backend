const rateLimit = require('express-rate-limit');

// General API rate limiter - 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req) => req.path.startsWith('/health'),
});

// Strict rate limiter for authentication endpoints - 5 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/register requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Test submission rate limiter - 10 submissions per hour (prevent spam)
const submissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 submissions per hour
  message: {
    success: false,
    message: 'Too many test submissions, please contact administrator.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Proctoring frame rate limiter - 5 frames per second per student
const proctoringLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 5, // Max 5 frames per second
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
