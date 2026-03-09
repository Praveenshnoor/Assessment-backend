const http = require('http');

async function testInstitutesEndpoint() {
  console.log('🧪 Testing /api/institutes Endpoint\n');
  
  // First, login to get a fresh token
  return new Promise((resolve) => {
    const loginData = JSON.stringify({
      email: 'admin@example.com',
      password: 'Admin@123'
    });
    
    const loginOptions = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    console.log('Step 1: Logging in...');
    
    const loginReq = http.request(loginOptions, (loginRes) => {
      let data = '';
      
      loginRes.on('data', (chunk) => {
        data += chunk;
      });
      
      loginRes.on('end', () => {
        console.log('Login Status:', loginRes.statusCode);
        
        if (loginRes.statusCode === 200) {
          const loginResponse = JSON.parse(data);
          console.log('✅ Login successful!');
          console.log('Token:', loginResponse.token.substring(0, 50) + '...\n');
          
          // Now test institutes endpoint
          console.log('Step 2: Testing /api/institutes...');
          
          const institutesOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/institutes',
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${loginResponse.token}`
            }
          };
          
          const institutesReq = http.request(institutesOptions, (institutesRes) => {
            let institutesData = '';
            
            institutesRes.on('data', (chunk) => {
              institutesData += chunk;
            });
            
            institutesRes.on('end', () => {
              console.log('Institutes Status:', institutesRes.statusCode);
              console.log('Response Body:', institutesData);
              
              if (institutesRes.statusCode === 200) {
                console.log('\n✅ Institutes endpoint working!');
                const parsed = JSON.parse(institutesData);
                console.log('Found', parsed.institutes.length, 'institutes');
              } else if (institutesRes.statusCode === 500) {
                console.log('\n❌ 500 Internal Server Error!');
                try {
                  const errorData = JSON.parse(institutesData);
                  console.log('Error Message:', errorData.message);
                  console.log('Error Details:', errorData.error);
                  console.log('Error Code:', errorData.code);
                } catch (e) {
                  console.log('Raw error:', institutesData);
                }
              }
              
              resolve();
            });
          });
          
          institutesReq.on('error', (error) => {
            console.error('❌ Request Error:', error.message);
            resolve();
          });
          
          institutesReq.end();
          
        } else {
          console.log('❌ Login failed!');
          console.log('Response:', data);
          resolve();
        }
      });
    });
    
    loginReq.on('error', (error) => {
      console.error('❌ Connection Error:', error.message);
      resolve();
    });
    
    loginReq.write(loginData);
    loginReq.end();
  });
}

testInstitutesEndpoint();
