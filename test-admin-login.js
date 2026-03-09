const http = require('http');

async function testAdminLogin() {
  console.log('🧪 Testing Admin Login Endpoint\n');
  
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      email: 'admin@example.com',
      password: 'wrongpassword123'
    });
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    console.log('📤 Sending POST to /api/admin/login');
    console.log('   Email: admin@example.com');
    console.log('   Password: (testing with wrong password)\n');
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📥 Response Status:', res.statusCode);
        console.log('📥 Response Body:', data);
        
        try {
          const jsonData = JSON.parse(data);
          console.log('📥 Parsed Response:', JSON.stringify(jsonData, null, 2));
        } catch (e) {
          // Couldn't parse as JSON
        }
        
        if (res.statusCode === 401) {
          console.log('\n✅ Good! Endpoint is accessible (wrong password returned 401 as expected)');
          console.log('🔑 Now you need to use the CORRECT password to log in');
          console.log('\nIf you forgot your password, run:');
          console.log('   node reset-admin-password.js');
        } else if (res.statusCode === 403) {
          console.log('\n❌ ERROR: Endpoint returned 403 (Forbidden)');
          console.log('   This means there\'s authentication middleware on the login route!');
        } else if (res.statusCode === 200) {
          console.log('\n❓ Unexpected: Login succeeded with wrong password?');
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Connection Error:', error.message);
      console.log('\n⚠️  Is the backend server running?');
      console.log('   Check: http://localhost:5000/health');
      resolve();
    });
    
    req.write(postData);
    req.end();
  });
}

testAdminLogin();
