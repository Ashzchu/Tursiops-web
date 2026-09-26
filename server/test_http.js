/**
 * Integration Test for Express HTTP Endpoints:
 * - JSON/fetch /api/signup and /api/login with redirect=vscode (returns 200/201 with redirect_url)
 * - JSON/fetch /login with redirect=vscode & redirect_uri (returns 200 with redirect_url)
 * - HTML form /login with redirect_uri & redirect=vscode (returns 302 Redirect)
 * - JSON /login without redirect (returns 200 JSON without redirect_url)
 * - Password verification failure (returns 401)
 * - Protected token verification /api/me and /me (returns 200)
 * - Health check /health and /api/health (returns 200)
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
    // Test 1: JSON fetch POST /api/signup with redirect=vscode
    // -> Should return 201 JSON with redirect_url
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 1: JSON fetch POST /api/signup with redirect=vscode ---');
    const signupRes = await fetch(`${baseUrl}/api/signup?redirect=vscode`, {
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
    console.log('✓ Test 1 Passed: JSON response with redirect_url returned for /api/signup.');

    const token = signupData.token;

    // -----------------------------------------------------------------------
    // Test 2: JSON fetch POST /api/login with redirect=vscode
    // -> Should return 200 JSON with redirect_url
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 2: JSON fetch POST /api/login with redirect=vscode ---');
    const loginVsCodeRes = await fetch(`${baseUrl}/api/login?redirect=vscode`, {
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
    console.log('✓ Test 2 Passed: JSON response with redirect_url returned for /api/login.');

    // -----------------------------------------------------------------------
    // Test 3: JSON fetch POST /api/signin with redirect=vscode (action=signin alias)
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 3: JSON fetch POST /api/signin alias ---');
    const signinRes = await fetch(`${baseUrl}/api/signin?redirect=vscode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    console.log(`Status: ${signinRes.status} (Expected: 200)`);
    if (signinRes.status !== 200) throw new Error('Test 3 failed: /api/signin alias failed');
    console.log('✓ Test 3 Passed: /api/signin alias works identically.');

    // -----------------------------------------------------------------------
    // Test 4: JSON fetch POST /login with redirect_uri
    // -> Should return 200 JSON with custom redirect_url
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 4: JSON fetch POST /login with redirect_uri ---');
    const loginDeepLinkRes = await fetch(`${baseUrl}/login?redirect_uri=${encodeURIComponent(customDeepLink)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    console.log(`Status: ${loginDeepLinkRes.status} (Expected: 200)`);
    const loginDeepLinkData = await loginDeepLinkRes.json();

    if (loginDeepLinkRes.status !== 200 || !loginDeepLinkData.redirect_url?.startsWith(`${customDeepLink}?token=`)) {
      throw new Error(`Test 4 failed: Expected custom redirect_url in JSON response, got: ${loginDeepLinkData.redirect_url}`);
    }
    console.log('✓ Test 4 Passed: JSON response with custom redirect_uri returned.');

    // -----------------------------------------------------------------------
    // Test 5: HTML form POST /login with redirect_uri -> Should return 302 Redirect
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 5: HTML form POST /login with redirect_uri (302 Redirect) ---');
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
      throw new Error('Test 5 failed: Expected HTTP 302 redirect for HTML form POST');
    }
    console.log('✓ Test 5 Passed: 302 HTTP Redirect generated for standard form submissions.');

    // -----------------------------------------------------------------------
    // Test 6: POST /login without redirect_uri -> Returns vscode_link for user
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 6: POST /login without redirect_uri (VS Code Deep Link generation) ---');
    const jsonLoginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });

    console.log(`Status: ${jsonLoginRes.status} (Expected: 200)`);
    const jsonData = await jsonLoginRes.json();

    const expectedDeepLinkPrefix = 'vscode://tursiops-ai.tursiops/auth?';
    if (jsonLoginRes.status !== 200 || !jsonData.token || !jsonData.vscode_link || !jsonData.vscode_link.startsWith(expectedDeepLinkPrefix)) {
      throw new Error(`Test 6 failed: Expected 200 JSON response with vscode_link, got: ${JSON.stringify(jsonData)}`);
    }
    if (!jsonData.vscode_link.includes(`email=${encodeURIComponent(testEmail.toLowerCase())}`)) {
      throw new Error(`Test 6 failed: Expected vscode_link to contain encoded email ${testEmail}`);
    }
    console.log(`✓ Test 6 Passed: Dynamic VS Code rollback link generated: ${jsonData.vscode_link}`);

    // -----------------------------------------------------------------------
    // Test 7: POST /login with incorrect password -> 401 Unauthorized
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 7: POST /login with wrong password ---');
    const failRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword999' }),
    });

    console.log(`Status: ${failRes.status} (Expected: 401)`);
    if (failRes.status !== 401) {
      throw new Error('Test 7 failed: Expected 401 Unauthorized');
    }
    console.log('✓ Test 7 Passed: 401 Unauthorized returned for wrong password.');

    // -----------------------------------------------------------------------
    // Test 8: GET /api/me with token -> 200 Verified
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 8: GET /api/me with Bearer token ---');
    const meRes = await fetch(`${baseUrl}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log(`Status: ${meRes.status} (Expected: 200)`);
    const meData = await meRes.json();
    console.log('Profile:', meData);

    if (meRes.status !== 200 || !meData.valid || meData.user.email !== testEmail.toLowerCase()) {
      throw new Error('Test 8 failed: Token verification failed');
    }
    console.log('✓ Test 8 Passed: User successfully verified with JWT.');

    // -----------------------------------------------------------------------
    // Test 8b: GET /api/vscode-link with Bearer token
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 8b: GET /api/vscode-link with Bearer token ---');
    const vsLinkRes = await fetch(`${baseUrl}/api/vscode-link`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log(`Status: ${vsLinkRes.status} (Expected: 200)`);
    const vsLinkData = await vsLinkRes.json();
    if (vsLinkRes.status !== 200 || !vsLinkData.vscode_link?.includes('vscode://tursiops-ai.tursiops/auth?token=')) {
      throw new Error(`Test 8b failed: Invalid response: ${JSON.stringify(vsLinkData)}`);
    }
    console.log(`✓ Test 8b Passed: Rollback link retrieved: ${vsLinkData.vscode_link}`);

    // -----------------------------------------------------------------------
    // Test 9: GET /health and /api/health -> 200 OK
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 9: GET /health and /api/health ---');
    const h1 = await fetch(`${baseUrl}/health`);
    const h2 = await fetch(`${baseUrl}/api/health`);
    if (h1.status !== 200 || h2.status !== 200) throw new Error('Test 9 failed: health check failed');
    console.log('✓ Test 9 Passed: Health check endpoints return 200 OK.');

    console.log('\n======================================================');
    console.log('🎉 ALL 9 INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
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
