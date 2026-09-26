/**
 * Authentication Route Handlers: /signup, /login, and VS Code Deep Link Redirection
 */
import { Router } from 'express';
import { findUserByEmail, createUser } from '../db.js';
import { hashPassword, verifyPassword, generateToken, buildCallbackUrl } from '../utils/auth.js';

const router = Router();

/**
 * Helper to extract redirect_uri from query parameters or body
 */
function getRedirectUri(req) {
  return req.query.redirect_uri || req.body.redirect_uri || null;
}

/**
 * Basic email format validator
 */
function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * -------------------------------------------------------------------------
 * POST /signup
 * Creates a new user in Turso, hashes password, and issues JWT.
 * If redirect_uri is provided, executes an HTTP 302 redirect to the IDE deep link.
 * -------------------------------------------------------------------------
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const redirectUri = getRedirectUri(req);

    // 1. Validate Input
    if (!email || !password) {
      if (req.accepts('html') && !req.xhr && !req.is('json')) {
        return res.status(400).send(renderAuthPage({
          mode: 'signup',
          redirectUri,
          error: 'Email and password are required.',
          email: email || '',
        }));
      }
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required.',
      });
    }

    if (!isValidEmail(email)) {
      if (req.accepts('html') && !req.xhr && !req.is('json')) {
        return res.status(400).send(renderAuthPage({
          mode: 'signup',
          redirectUri,
          error: 'Please provide a valid email address.',
          email,
        }));
      }
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format.',
      });
    }

    if (password.length < 6) {
      if (req.accepts('html') && !req.xhr && !req.is('json')) {
        return res.status(400).send(renderAuthPage({
          mode: 'signup',
          redirectUri,
          error: 'Password must be at least 6 characters long.',
          email,
        }));
      }
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 6 characters long.',
      });
    }

    // 2. Check if user already exists in Turso
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      if (req.accepts('html') && !req.xhr && !req.is('json')) {
        return res.status(409).send(renderAuthPage({
          mode: 'signup',
          redirectUri,
          error: 'An account with this email already exists.',
          email,
        }));
      }
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email already exists.',
      });
    }

    // 3. Hash Password using bcrypt
    const passwordHash = await hashPassword(password);

    // 4. Create User in Turso libSQL
    const newUser = await createUser({
      email,
      passwordHash,
    });

    // 5. Generate secure JWT
    const token = generateToken(newUser);

    // 6. Handle Response / Deep Link Redirection
    if (redirectUri) {
      const callbackUrl = buildCallbackUrl(redirectUri, token);
      console.log(`[AUTH] User ${newUser.email} signed up. Redirecting 302 to: ${callbackUrl}`);
      return res.redirect(302, callbackUrl);
    }

    // Fallback: Standard Web Session Response
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * -------------------------------------------------------------------------
 * POST /login
 * Authenticates user credentials via Turso and generates JWT.
 * If redirect_uri is provided, executes an HTTP 302 redirect to the IDE deep link.
 * -------------------------------------------------------------------------
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const redirectUri = getRedirectUri(req);

    // 1. Validate Input
    if (!email || !password) {
      if (req.accepts('html') && !req.xhr && !req.is('json')) {
        return res.status(400).send(renderAuthPage({
          mode: 'login',
          redirectUri,
          error: 'Email and password are required.',
          email: email || '',
        }));
      }
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required.',
      });
    }

    // 2. Lookup user in Turso
    const user = await findUserByEmail(email);
    if (!user) {
      if (req.accepts('html') && !req.xhr && !req.is('json')) {
        return res.status(401).send(renderAuthPage({
          mode: 'login',
          redirectUri,
          error: 'Invalid email or password.',
          email,
        }));
      }
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    // 3. Verify Password against stored bcrypt hash
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      if (req.accepts('html') && !req.xhr && !req.is('json')) {
        return res.status(401).send(renderAuthPage({
          mode: 'login',
          redirectUri,
          error: 'Invalid email or password.',
          email,
        }));
      }
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password.',
      });
    }

    // 4. Generate secure JWT
    const token = generateToken(user);

    // 5. Handle Response / Deep Link Redirection
    if (redirectUri) {
      const callbackUrl = buildCallbackUrl(redirectUri, token);
      console.log(`[AUTH] User ${user.email} logged in. Redirecting 302 to: ${callbackUrl}`);
      return res.redirect(302, callbackUrl);
    }

    // Fallback: Standard Web Session Response
    return res.status(200).json({
      success: true,
      message: 'Authenticated successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * -------------------------------------------------------------------------
 * GET /login
 * Renders the clean dark-themed login interface for VS Code browser auth.
 * -------------------------------------------------------------------------
 */
router.get('/login', (req, res) => {
  const redirectUri = getRedirectUri(req);
  res.send(renderAuthPage({
    mode: 'login',
    redirectUri,
    email: '',
  }));
});

/**
 * -------------------------------------------------------------------------
 * GET /signup
 * Renders the clean dark-themed signup interface for VS Code browser auth.
 * -------------------------------------------------------------------------
 */
router.get('/signup', (req, res) => {
  const redirectUri = getRedirectUri(req);
  res.send(renderAuthPage({
    mode: 'signup',
    redirectUri,
    email: '',
  }));
});

/**
 * Helper to render an elegant web interface matching the Tursiops developer aesthetic
 */
function renderAuthPage({ mode, redirectUri, error, email }) {
  const isLogin = mode === 'login';
  const title = isLogin ? 'Sign In to Tursiops' : 'Create Tursiops Account';
  const actionUrl = isLogin ? '/login' : '/signup';
  const queryParam = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
  const toggleUrl = isLogin
    ? `/signup${queryParam}`
    : `/login${queryParam}`;
  const toggleText = isLogin
    ? "Don't have an account? Sign up"
    : 'Already have an account? Sign in';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Persistent Coding Memory</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #070a10;
      color: #f8fafc;
      font-family: 'Inter', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      position: relative;
    }
    .card {
      background-color: #0c111a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 36px 32px;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.8), 0 0 35px rgba(56, 189, 248, 0.08);
      position: relative;
      z-index: 10;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
      justify-content: center;
    }
    .brand-glyph { font-size: 26px; }
    .brand-name {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.08em;
    }
    h2 {
      font-size: 20px;
      font-weight: 600;
      text-align: center;
      margin-bottom: 8px;
    }
    p.sub {
      color: #94a3b8;
      font-size: 13px;
      text-align: center;
      margin-bottom: 24px;
    }
    .error-box {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
      margin-bottom: 20px;
    }
    .badge-ide {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 11px;
      font-family: 'Fira Code', monospace;
      color: #38bdf8;
      margin-bottom: 20px;
      word-break: break-all;
    }
    .form-group {
      margin-bottom: 18px;
    }
    label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: #cbd5e1;
      margin-bottom: 6px;
    }
    input {
      width: 100%;
      background: #06090e;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 6px;
      padding: 10px 14px;
      color: #ffffff;
      font-size: 14px;
      outline: none;
      transition: border-color 0.15s;
    }
    input:focus {
      border-color: #38bdf8;
      box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.15);
    }
    button.btn-submit {
      width: 100%;
      background: #ffffff;
      color: #06090e;
      border: none;
      border-radius: 6px;
      padding: 11px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
      margin-top: 8px;
    }
    button.btn-submit:hover {
      background: #e2e8f0;
    }
    .footer-link {
      text-align: center;
      margin-top: 20px;
      font-size: 13px;
    }
    .footer-link a {
      color: #38bdf8;
      text-decoration: none;
    }
    .footer-link a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <span class="brand-glyph">🐬</span>
      <span class="brand-name">TURSIOPS</span>
    </div>

    <h2>${title}</h2>
    <p class="sub">Authenticate to sync persistent coding directives</p>

    ${redirectUri ? `<div class="badge-ide">IDE Redirect: ${escapeHtml(redirectUri)}</div>` : ''}

    ${error ? `<div class="error-box">${escapeHtml(error)}</div>` : ''}

    <form method="POST" action="${actionUrl}${queryParam}">
      ${redirectUri ? `<input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">` : ''}

      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" required placeholder="you@domain.com" value="${escapeHtml(email || '')}">
      </div>

      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required placeholder="${isLogin ? '••••••••' : 'At least 6 characters'}">
      </div>

      <button type="submit" class="btn-submit">${isLogin ? 'Sign In & Connect to IDE' : 'Create Account & Connect'}</button>
    </form>

    <div class="footer-link">
      <a href="${toggleUrl}">${toggleText}</a>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default router;
