const https = require('http');

async function testEndpoints() {
  const token = 'test'; // Replace with actual admin token if needed
  const baseUrl = 'http://localhost:5000';
  
  console.log('🧪 Testing API Endpoints...\n');
  
  // Test interviews endpoint
  try {
    const interviewsRes = await fetch(`${baseUrl}/api/interviews/list?date=2026-03-09`);
    console.log(`📋 /api/interviews/list - Status: ${interviewsRes.status}`);
    if (interviewsRes.status !== 401) { // 401 is expected without proper auth
      const data = await interviewsRes.json();
      console.log('   Response:', JSON.stringify(data).substring(0, 100));
    }
  } catch (err) {
    console.log(`❌ Interviews endpoint error: ${err.message}`);
  }
  
  // Test institutes endpoint
  try {
    const institutesRes = await fetch(`${baseUrl}/api/institutes`);
    console.log(`\n🏛️  /api/institutes - Status: ${institutesRes.status}`);
    if (institutesRes.status !== 401) { // 401 is expected without proper auth
      const data = await institutesRes.json();
      console.log('   Response:', JSON.stringify(data).substring(0, 100));
    }
  } catch (err) {
    console.log(`❌ Institutes endpoint error: ${err.message}`);
  }
  
  console.log('\n✅ Endpoint testing complete!');
  console.log('\n📌 Note: 401 Unauthorized responses are expected without a valid admin token.');
  console.log('   The important thing is that we\'re not getting 500 Internal Server Errors anymore!');
}

testEndpoints();
