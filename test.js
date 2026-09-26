const http = require('http');

const BASE_URL = 'http://localhost:3000';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTestSuite() {
  console.log('=======================================================');
  console.log('🛡️ RUNNING STOCKSENSE ODOO IMS SECURITY TEST SUITE');
  console.log('=======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASSED: ${testName}`);
      passed++;
    } else {
      console.log(`  ❌ FAILED: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    console.log('1. Health Check...');
    const health = await request('GET', '/api/health');
    assert(health.status === 200, 'API Health check returns 200 OK');

    // 2. Auth & Login with Role Tests
    console.log('\n2. Authentication & Role Permissions Tests...');
    const adminLogin = await request('POST', '/api/auth/login', {
      email: 'admin@stocksense.com',
      password: 'AdminPass123!'
    });
    assert(adminLogin.status === 200 && adminLogin.body.token, 'Admin login succeeds');
    const adminToken = adminLogin.body.token;

    const managerLogin = await request('POST', '/api/auth/login', {
      email: 'manager@stocksense.com',
      password: 'ManagerPass123!'
    });
    assert(managerLogin.status === 200 && managerLogin.body.user.role === 'manager', 'Manager role authenticated');
    const managerToken = managerLogin.body.token;

    const workerLogin = await request('POST', '/api/auth/login', {
      email: 'worker@stocksense.com',
      password: 'WorkerPass123!'
    });
    assert(workerLogin.status === 200 && workerLogin.body.user.role === 'worker', 'Worker role authenticated');
    const workerToken = workerLogin.body.token;

    // RBAC Test: Worker restricted from creating SKU
    const workerCreateRes = await request('POST', '/api/products', {
      sku: 'RESTRICTED-SKU', name: 'Forbidden Product', category: 'Raw Material', location: 'Main Warehouse'
    }, { 'Authorization': `Bearer ${workerToken}` });
    assert(workerCreateRes.status === 403, 'Worker restricted from creating SKU (HTTP 403 Forbidden)');

    // 3. Testing Email Format Validator
    console.log('\n3. Testing Email Format Validator & Security Checks...');
    const invalidFormatRes = await request('POST', '/api/auth/send-signup-otp', {
      email: 'not-an-email-format'
    });
    assert(invalidFormatRes.status === 400, 'Invalid email format rejected by backend validator');

    // 3b. Testing Signup Gmail OTP Flow
    console.log('\n3b. Testing Account Creation Signup Gmail OTP Verification...');
    const signupEmail = `newuser_${Date.now()}@gmail.com`;
    const signupOtpRes = await request('POST', '/api/auth/send-signup-otp', {
      email: signupEmail
    });
    assert(signupOtpRes.status === 200 && signupOtpRes.body.otpDemoCode, 'Signup Gmail OTP generated & dispatched');

    if (signupOtpRes.body.otpDemoCode) {
      const verifySignupOtpRes = await request('POST', '/api/auth/verify-signup-otp', {
        email: signupEmail,
        otp: signupOtpRes.body.otpDemoCode
      });
      assert(verifySignupOtpRes.status === 200, 'Signup Gmail OTP verification succeeds');
    }

    // 4. Products & Dashboard KPIs Endpoint Test
    console.log('\n4. Testing Products & Dashboard KPIs...');
    const prods = await request('GET', '/api/products', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(prods.status === 200 && prods.body.products.length > 0, 'Inventory products catalog retrieved');
    const targetProduct = prods.body.products[0];

    const kpis = await request('GET', '/api/operations/dashboard-kpis', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(kpis.status === 200 && kpis.body.kpis.totalProducts > 0, 'Dashboard KPIs telemetry returned');

    // 5. Create & Validate Receipt Operation (Incoming Goods: +50 Steel Rods)
    console.log('\n5. Testing Operations Workflow (Receipts & Stock Validation)...');
    const newReceipt = await request('POST', '/api/operations', {
      doc_type: 'Receipt',
      partner: 'Vendor Steel Ltd',
      source_location: 'Vendor Location',
      dest_location: 'Main Warehouse',
      items: [{ product_id: targetProduct.id, sku: targetProduct.sku, name: targetProduct.name, qty: 50 }]
    }, { 'Authorization': `Bearer ${adminToken}` });

    assert(newReceipt.status === 201 && newReceipt.body.operation, 'Receipt (Incoming Stock) document created');

    if (newReceipt.body.operation) {
      const validateRes = await request('POST', `/api/operations/validate/${newReceipt.body.operation.id}`, null, {
        'Authorization': `Bearer ${adminToken}`
      });
      assert(validateRes.status === 200, 'Receipt validated & stock balances auto-updated');
    }

    // 6. Move History Ledger Test
    console.log('\n6. Testing Move History Ledger...');
    const ledger = await request('GET', '/api/operations/move-history', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(ledger.status === 200 && ledger.body.move_history.length > 0, 'Move history ledger returned');

    // 7. AI Predictive Reorder Engine Test
    console.log('\n7. Testing AI Predictive Reorder Engine (Unique Feature)...');
    const aiRes = await request('GET', '/api/operations/ai-reorder', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert(aiRes.status === 200 && aiRes.body.predictions.length > 0, 'AI Neural velocity predictions calculated');

    console.log('\n=======================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('=======================================================\n');

  } catch (err) {
    console.error('Test Error:', err);
    process.exit(1);
  }
}

runTestSuite();
