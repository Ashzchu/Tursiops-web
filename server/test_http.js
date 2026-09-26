/**
 * Integration Test for Express HTTP Endpoints:
 * - JSON/fetch /signup and /login with redirect=vscode (returns 200/201 with redirect_url)
 * - JSON/fetch /login with redirect_uri (returns 200 with redirect_url)
 * - HTML form /login with redirect_uri & redirect=vscode (returns 302 Redirect)
 * - JSON /login without redirect (returns 200 JSON without redirect_url)
 * - Password verification failure (returns 401)
 * - Protected token verification /api/me (returns 200)
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
  const customDeepLink = 'vscode://ashzchu.tursiops/auth';

  try {
    // -----------------------------------------------------------------------
    // Test 1: JSON fetch POST /signup with redirect=vscode
    // -> Should return 201 JSON with redirect_url
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 1: JSON fetch POST /signup with redirect=vscode ---');
    const signupRes = await fetch(`${baseUrl}/signup?redirect=vscode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    console.log(`Status: ${signupRes.status} (Expected: 201)`);
    const signupData = await signupRes.json();
    console.log('Signup Response:', signupData);

    if (signupRes.status !== 201 || !signupData.success || !signupData.token) {
      throw new Error('Test 1 failed: Expected 201 JSON response with token');
    }
    if (!signupData.redirect_url || !signupData.redirect_url.startsWith('vscode://tursiops-ai.tursiops/auth?token=')) {
      throw new Error(`Test 1 failed: Expected redirect_url for VS Code extension, got: ${signupData.redirect_url}`);
    }
    console.log('✓ Test 1 Passed: JSON response with redirect_url returned for VS Code signup.');

    const token = signupData.token;

    // -----------------------------------------------------------------------
    // Test 2: JSON fetch POST /login with redirect=vscode
    // -> Should return 200 JSON with redirect_url
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 2: JSON fetch POST /login with redirect=vscode ---');
    const loginVsCodeRes = await fetch(`${baseUrl}/login?redirect=vscode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    console.log(`Status: ${loginVsCodeRes.status} (Expected: 200)`);
    const loginVsCodeData = await loginVsCodeRes.json();
    console.log('Login Response:', loginVsCodeData);

    if (loginVsCodeRes.status !== 200 || !loginVsCodeData.token) {
      throw new Error('Test 2 failed: Expected 200 JSON response');
    }
    if (!loginVsCodeData.redirect_url || !loginVsCodeData.redirect_url.startsWith('vscode://tursiops-ai.tursiops/auth?token=')) {
      throw new Error(`Test 2 failed: Expected redirect_url for VS Code extension, got: ${loginVsCodeData.redirect_url}`);
    }
    if (!loginVsCodeData.redirect_url.includes(`email=${encodeURIComponent(testEmail.toLowerCase())}`)) {
      throw new Error(`Test 2 failed: redirect_url should contain encoded email`);
    }
    console.log('✓ Test 2 Passed: JSON response with redirect_url returned for VS Code login.');

    // -----------------------------------------------------------------------
    // Test 3: JSON fetch POST /login with redirect_uri
    // -> Should return 200 JSON with custom redirect_url
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 3: JSON fetch POST /login with redirect_uri ---');
    const loginDeepLinkRes = await fetch(`${baseUrl}/login?redirect_uri=${encodeURIComponent(customDeepLink)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    console.log(`Status: ${loginDeepLinkRes.status} (Expected: 200)`);
    const loginDeepLinkData = await loginDeepLinkRes.json();

    if (loginDeepLinkRes.status !== 200 || !loginDeepLinkData.redirect_url?.startsWith(`${customDeepLink}?token=`)) {
      throw new Error(`Test 3 failed: Expected custom redirect_url in JSON response, got: ${loginDeepLinkData.redirect_url}`);
    }
    console.log('✓ Test 3 Passed: JSON response with custom redirect_uri returned.');

    // -----------------------------------------------------------------------
    // Test 4: HTML form POST /login with redirect_uri -> Should return 302 Redirect
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 4: HTML form POST /login with redirect_uri (302 Redirect) ---');
    const formParams = new URLSearchParams({ email: testEmail, password: testPassword, redirect_uri: customDeepLink });
    const formRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml',
      },
      body: formParams.toString(),
      redirect: 'manual',
    });

    console.log(`Status: ${formRes.status} (Expected: 302)`);
    const location = formRes.headers.get('location');
    console.log(`Location: ${location}`);

    if (formRes.status !== 302 || !location || !location.startsWith(`${customDeepLink}?token=`)) {
      throw new Error('Test 4 failed: Expected HTTP 302 redirect for HTML form POST');
    }
    console.log('✓ Test 4 Passed: 302 HTTP Redirect generated for standard form submissions.');

    // -----------------------------------------------------------------------
    // Test 5: POST /login without redirect_uri -> Standard JSON without redirect_url
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 5: POST /login without redirect_uri (JSON fallback) ---');
    const jsonLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    console.log(`Status: ${jsonLoginRes.status} (Expected: 200)`);
    const jsonData = await jsonLoginRes.json();

    if (jsonLoginRes.status !== 200 || !jsonData.token || jsonData.redirect_url) {
      throw new Error('Test 5 failed: Expected 200 JSON response without redirect_url');
    }
    console.log('✓ Test 5 Passed: Standard web session JSON returned without redirect_url.');

    // -----------------------------------------------------------------------
    // Test 6: POST /login with incorrect password -> 401 Unauthorized
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 6: POST /login with wrong password ---');
    const failRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword999' }),
    });

    console.log(`Status: ${failRes.status} (Expected: 401)`);
    if (failRes.status !== 401) {
      throw new Error('Test 6 failed: Expected 401 Unauthorized');
    }
    console.log('✓ Test 6 Passed: 401 Unauthorized returned for wrong password.');

    // -----------------------------------------------------------------------
    // Test 7: GET /api/me with token -> 200 Verified
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 7: GET /api/me with Bearer token ---');
    const meRes = await fetch(`${baseUrl}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`Status: ${meRes.status} (Expected: 200)`);
    const meData = await meRes.json();
    console.log('Profile:', meData);

    if (meRes.status !== 200 || !meData.valid || meData.user.email !== testEmail.toLowerCase()) {
      throw new Error('Test 7 failed: Token verification failed');
    }
    console.log('✓ Test 7 Passed: User successfully verified with JWT.');

    console.log('\n======================================================');
    console.log('🎉 ALL 7 INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
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
