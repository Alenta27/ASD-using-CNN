const http = require('http');

// Test the datasets API endpoint
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/researcher/datasets',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token',
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  console.log(`STATUS: ${res.statusCode}`);
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('DATASETS API RESPONSE:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
  console.error('❌ Could not connect to server on port 5000');
  console.error('Make sure the backend server is running with: npm start');
});

req.end();