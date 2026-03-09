require('dotenv').config();

console.log('🔐 Environment Check:');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? `Set (${process.env.JWT_SECRET.substring(0, 20)}...)` : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('PORT:', process.env.PORT || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

// Test JWT generation and verification
const jwt = require('jsonwebtoken');

const testPayload = { id: 1, email: 'test@admin.com', role: 'admin', type: 'session' };
const token = jwt.sign(testPayload, process.env.JWT_SECRET || 'fallback_secret_key', { expiresIn: '24h' });

console.log('\n📝 Test Token Generated:', token.substring(0, 50) + '...');

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
  console.log('✅ Token verification: SUCCESS');
  console.log('Decoded:', decoded);
} catch (err) {
  console.log('❌ Token verification: FAILED');
  console.log('Error:', err.message);
}
