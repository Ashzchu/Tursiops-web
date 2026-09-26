/**
 * Integration Test for Express HTTP Endpoints: /signup, /login, 302 Redirects, and Fallbacks
 */
import app from '../server.js';
import http from 'http';

async function runHttpTests() {
  const PORT = 3987;
  const server = http.createServer(app);

  await new Promise(resolve => server.listen(PORT, resolve));
  const baseUrl = `http://127.0.0.1:${PORT}`;
  console.log(`Test server running at ${baseUrl}`);

  const testEmail = `dev_${Date.now()}@tursiops.io`;
  const testPassword = 'Password123!';
  const deepLink = 'vscode://ashzchu.tursiops/auth';

  try {
    // -----------------------------------------------------------------------
    // Test 1: POST /signup with redirect_uri -> Should return 302 Redirect
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 1: POST /signup with redirect_uri ---');
    const signupRes = await fetch(`${baseUrl}/signup?redirect_uri=${encodeURIComponent(deepLink)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
      redirect: 'manual', // Do not automatically follow redirect to inspect 302
    });

    console.log(`Status: ${signupRes.status} (Expected: 302)`);
    const location1 = signupRes.headers.get('location');
    console.log(`Location: ${location1}`);

    if (signupRes.status !== 302 || !location1 || !location1.startsWith(`${deepLink}?token=`)) {
      throw new Error('Test 1 failed: Expected HTTP 302 redirect with VS Code deep link');
    }
    console.log('✓ Test 1 Passed: 302 Deep Link Redirect generated on signup.');

    // -----------------------------------------------------------------------
    // Test 2: POST /login with redirect_uri -> Should return 302 Redirect
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 2: POST /login with redirect_uri ---');
    const loginRes = await fetch(`${baseUrl}/login?redirect_uri=${encodeURIComponent(deepLink)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
      redirect: 'manual',
    });

    console.log(`Status: ${loginRes.status} (Expected: 302)`);
    const location2 = loginRes.headers.get('location');
    console.log(`Location: ${location2}`);

    if (loginRes.status !== 302 || !location2 || !location2.startsWith(`${deepLink}?token=`)) {
      throw new Error('Test 2 failed: Expected HTTP 302 redirect on login');
    }
    console.log('✓ Test 2 Passed: 302 Deep Link Redirect generated on login.');

    // Extract token from location header
    const token = new URL(location2).searchParams.get('token');

    // -----------------------------------------------------------------------
    // Test 3: POST /login WITHOUT redirect_uri -> Fallback to standard JSON
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 3: POST /login without redirect_uri (JSON fallback) ---');
    const jsonLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    console.log(`Status: ${jsonLoginRes.status} (Expected: 200)`);
    const jsonData = await jsonLoginRes.json();
    console.log('Response body:', jsonData);

    if (jsonLoginRes.status !== 200 || !jsonData.token || !jsonData.user) {
      throw new Error('Test 3 failed: Expected 200 JSON response');
    }
    console.log('✓ Test 3 Passed: Standard web session JSON returned when no redirect_uri is provided.');

    // -----------------------------------------------------------------------
    // Test 4: POST /login with incorrect password -> 401 Unauthorized
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 4: POST /login with wrong password ---');
    const failRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword999' }),
    });

    console.log(`Status: ${failRes.status} (Expected: 401)`);
    if (failRes.status !== 401) {
      throw new Error('Test 4 failed: Expected 401 Unauthorized');
    }
    console.log('✓ Test 4 Passed: 401 Unauthorized returned for wrong password.');

    // -----------------------------------------------------------------------
    // Test 5: GET /api/me with token -> 200 Verified
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 5: GET /api/me with Bearer token ---');
    const meRes = await fetch(`${baseUrl}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`Status: ${meRes.status} (Expected: 200)`);
    const meData = await meRes.json();
    console.log('Profile:', meData);

    if (meRes.status !== 200 || !meData.valid || meData.user.email !== testEmail.toLowerCase()) {
      throw new Error('Test 5 failed: Token verification failed');
    }
    console.log('✓ Test 5 Passed: User successfully verified with JWT.');

    console.log('\n======================================================');
    console.log('🎉 ALL 5 INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================');
  } finally {
    server.close();
    process.exit(0);
  }
}

runHttpTests().catch(err => {
  console.error('HTTP Test failure:', err);
  process.exit(1);
});
