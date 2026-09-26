/**
 * End-to-End Verification Test for Turso Authentication & VS Code Deep Link Flow
 */
import { initDb, findUserByEmail } from './db.js';
import { hashPassword, verifyPassword, generateToken, verifyToken, buildCallbackUrl } from './utils/auth.js';

async function runTests() {
  console.log('--- STARTING TURSIOPS AUTH FLOW VERIFICATION ---');

  // 1. Database Init Test
  console.log('1. Testing Turso schema initialization...');
  await initDb();
  console.log('   ✓ Turso schema verified.');

  // 2. Password Hashing Test
  console.log('2. Testing bcrypt password hashing & verification...');
  const rawPassword = 'SecureDeveloperPassword!2026';
  const hashed = await hashPassword(rawPassword);
  console.log('   ✓ Hashed password created:', hashed.slice(0, 25) + '...');
  
  const isValid = await verifyPassword(rawPassword, hashed);
  if (!isValid) throw new Error('Password verification failed for valid password');
  console.log('   ✓ Valid password verified successfully.');

  const isInvalid = await verifyPassword('WrongPassword', hashed);
  if (isInvalid) throw new Error('Password verification succeeded for invalid password');
  console.log('   ✓ Invalid password rejected successfully.');

  // 3. JWT Token Generation and Verification Test
  console.log('3. Testing JWT generation and verification...');
  const mockUser = {
    id: 'usr_test_123',
    email: 'developer@tursiops.dev',
  };
  const token = generateToken(mockUser);
  console.log('   ✓ Generated JWT token:', token.slice(0, 35) + '...');

  const decoded = verifyToken(token);
  if (decoded.id !== mockUser.id || decoded.email !== mockUser.email) {
    throw new Error('JWT payload mismatch');
  }
  console.log('   ✓ JWT verified. Decoded payload:', { id: decoded.id, email: decoded.email, exp: decoded.exp });

  // 4. VS Code Deep Link Callback URL Builder Test
  console.log('4. Testing VS Code Deep Link callback generation...');
  const deepLink1 = 'vscode://ashzchu.tursiops-coding-memory/auth';
  const callbackUrl1 = buildCallbackUrl(deepLink1, token);
  console.log('   ✓ Clean deep link redirect:', callbackUrl1);
  if (!callbackUrl1.startsWith('vscode://ashzchu.tursiops-coding-memory/auth?token=')) {
    throw new Error('Callback URL 1 malformed');
  }

  const deepLink2 = 'vscode://ashzchu.tursiops/auth?session=xyz&source=editor';
  const callbackUrl2 = buildCallbackUrl(deepLink2, token);
  console.log('   ✓ Query-preserving deep link redirect:', callbackUrl2);
  if (!callbackUrl2.includes('session=xyz') || !callbackUrl2.includes('&token=')) {
    throw new Error('Callback URL 2 malformed');
  }

  // 5. Cursor Deep Link Test
  const deepLink3 = 'cursor://tursiops/auth';
  const callbackUrl3 = buildCallbackUrl(deepLink3, token);
  console.log('   ✓ Cursor IDE deep link redirect:', callbackUrl3);

  console.log('--- ALL AUTHENTICATION UTILITIES & TURSO CHECKS PASSED ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
