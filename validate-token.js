const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

console.log('🔍 JWT Token Validator\n');
console.log('Current JWT_SECRET:', JWT_SECRET.substring(0, 20) + '...\n');

// Sample token formats to test
const testTokens = [
  // Test with fallback secret
  jwt.sign({ id: 1, email: 'admin@example.com', role: 'admin', type: 'session' }, 'fallback_secret_key', { expiresIn: '24h' }),
  // Test with env secret
  jwt.sign({ id: 1, email: 'admin@example.com', role: 'admin', type: 'session' }, JWT_SECRET, { expiresIn: '24h' })
];

console.log('🧪 Testing token validation:\n');

testTokens.forEach((token, idx) => {
  console.log(`Token ${idx + 1} (first 50 chars): ${token.substring(0, 50)}...`);
  
  // Try with current secret
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(`  ✅ Valid with current secret`);
    console.log(`     Payload:`, decoded);
  } catch (err) {
    console.log(`  ❌ Invalid: ${err.message}`);
  }
  
  // Try with fallback
  try {
    const decoded = jwt.verify(token, 'fallback_secret_key');
    console.log(`  ✅ Valid with fallback secret`);
  } catch (err) {
    console.log(`  ❌ Invalid with fallback: ${err.message}`);
  }
  
  console.log('');
});

console.log('📝 Instructions to get your token from browser:');
console.log('   1. Open browser Developer Tools (F12)');
console.log('   2. Go to Console tab');
console.log('   3. Type: localStorage.getItem("adminToken")');
console.log('   4. Copy the token and paste it below to test\n');

// If you want to test a specific token, uncomment this:
// const browserToken = 'PASTE_YOUR_TOKEN_HERE';
// console.log('Testing your browser token:');
// try {
//   const decoded = jwt.verify(browserToken, JWT_SECRET);
//   console.log('✅ Your token is VALID!');
//   console.log('Token data:', decoded);
// } catch (err) {
//   console.log('❌ Your token is INVALID:', err.message);
//   console.log('You need to log out and log back in.');
// }
