/**
 * Test script for KNN API endpoints
 * Run: node test_knn_api.js
 */

const http = require('http');

// Configuration
const API_BASE = 'http://localhost:5000';
const TOKEN = 'YOUR_BEARER_TOKEN_HERE'; // Replace with actual token

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test cases
const tests = [
  {
    name: 'Get KNN Statistics',
    method: 'GET',
    path: '/api/researcher/knn-stats',
    data: null
  },
  {
    name: 'Get KNN Validation',
    method: 'GET',
    path: '/api/researcher/knn-validate',
    data: null
  },
  {
    name: 'Predict Control (Typical Development)',
    method: 'POST',
    path: '/api/researcher/knn-predict',
    data: {
      k: 5,
      newSample: {
        AGE_AT_SCAN: 25,
        FIQ: 110,
        VIQ: 115,
        PIQ: 105,
        ADI_R_SOCIAL_TOTAL_A: 2,
        ADI_R_VERBAL_TOTAL_BV: 3,
        ADI_RRB_TOTAL_C: 1,
        ADOS_TOTAL: 3,
        ADOS_COMM: 1,
        ADOS_SOCIAL: 2,
        SRS_RAW_TOTAL: 35,
        AQ_TOTAL: 12
      }
    }
  },
  {
    name: 'Predict ASD',
    method: 'POST',
    path: '/api/researcher/knn-predict',
    data: {
      k: 5,
      newSample: {
        AGE_AT_SCAN: 28,
        FIQ: 95,
        VIQ: 88,
        PIQ: 102,
        ADI_R_SOCIAL_TOTAL_A: 24,
        ADI_R_VERBAL_TOTAL_BV: 18,
        ADI_RRB_TOTAL_C: 12,
        ADOS_TOTAL: 18,
        ADOS_COMM: 8,
        ADOS_SOCIAL: 10,
        SRS_RAW_TOTAL: 95,
        AQ_TOTAL: 35
      }
    }
  },
  {
    name: 'Predict with k=3',
    method: 'POST',
    path: '/api/researcher/knn-predict',
    data: {
      k: 3,
      newSample: {
        AGE_AT_SCAN: 30,
        FIQ: 100,
        VIQ: 100,
        PIQ: 100,
        ADI_R_SOCIAL_TOTAL_A: 10,
        ADI_R_VERBAL_TOTAL_BV: 10,
        ADI_RRB_TOTAL_C: 5,
        ADOS_TOTAL: 8,
        ADOS_COMM: 3,
        ADOS_SOCIAL: 5,
        SRS_RAW_TOTAL: 50,
        AQ_TOTAL: 20
      }
    }
  }
];

// Run tests
async function runTests() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║    KNN API Test Suite                      ║');
  console.log('╚════════════════════════════════════════════╝\n');

  if (TOKEN === 'YOUR_BEARER_TOKEN_HERE') {
    console.log('⚠️  WARNING: Bearer token not set!');
    console.log('   Please update TOKEN variable with a valid JWT token');
    console.log('   You can get a token by logging in through the frontend\n');
  }

  console.log(`📡 API Base: ${API_BASE}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n► Test: ${test.name}`);
      console.log(`  Method: ${test.method} ${test.path}`);

      const response = await makeRequest(test.method, test.path, test.data);

      if (response.status === 200) {
        console.log(`  ✅ Status: ${response.status} OK`);
        console.log(`  📊 Response:`, JSON.stringify(response.data, null, 2).split('\n').slice(0, 10).join('\n'));
        if (Object.keys(response.data).length > 10) {
          console.log('  ...(truncated)');
        }
        passed++;
      } else if (response.status === 401) {
        console.log(`  ❌ Status: ${response.status} Unauthorized`);
        console.log(`  💡 Hint: Make sure TOKEN is set correctly`);
        failed++;
      } else if (response.status === 403) {
        console.log(`  ❌ Status: ${response.status} Forbidden`);
        console.log(`  💡 Hint: Check user permissions for analytics`);
        failed++;
      } else {
        console.log(`  ❌ Status: ${response.status}`);
        console.log(`  Response:`, response.data);
        failed++;
      }
    } catch (error) {
      console.log(`  ❌ Error:`, error.message);
      console.log(`  💡 Hint: Make sure backend server is running on ${API_BASE}`);
      failed++;
    }
  }

  console.log('\n╔════════════════════════════════════════════╗');
  console.log(`║    Results: ${passed} Passed, ${failed} Failed        ║`);
  console.log('╚════════════════════════════════════════════╝\n');

  if (failed === 0 && passed > 0) {
    console.log('✅ All tests passed! KNN API is working correctly.\n');
  } else {
    console.log('⚠️  Some tests failed. Check the output above.\n');
  }
}

// Run
runTests().catch(console.error);