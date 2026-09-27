/**
 * Authentication Route Handlers: /signup, /login, and VS Code Deep Link Redirection
 */
import { Router } from 'express';
import { findUserByEmail, createUser, findUserById, getUserGeminiKey, setUserGeminiKey } from '../db.js';
import { hashPassword, verifyPassword, generateToken, verifyToken, buildCallbackUrl, buildVsCodeRollbackUrl } from '../utils/auth.js';

const router = Router();

/**
 * Helper to extract redirect_uri from query parameters or body
 */
function getRedirectUri(req) {
  const uri = req.query.redirect_uri || req.body?.redirect_uri;
  if (uri) return uri;

  const redirect = req.query.redirect || req.body?.redirect;
  if (redirect && (redirect.includes('://') || redirect.startsWith('vscode:') || redirect.startsWith('cursor:'))) {
    return redirect;
  }
  return null;
}

/**
 * Helper to extract redirect param (e.g. 'vscode') from query or body
 */
function getRedirectParam(req) {
  return req.query.redirect || req.body?.redirect || null;
}

/**
 * Determine if request is from fetch / AJAX / JSON client
 */
function isJsonRequest(req) {
  if (req.is('json')) return true;
  if (req.xhr) return true;
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('application/json')) return true;
  const accept = req.headers['accept'] || '';
  if (accept.includes('application/json') && !accept.includes('text/html')) return true;
  if (!req.accepts('html')) return true;
  return false;
}

/**
 * Resolves the final redirect URL for deep linking.
 * Defaults to the official Tursiops VS Code rollback link per the authenticated user's email:
 * vscode://tursiops-ai.tursiops/auth?token=<token>&email=<email>
 */
export function resolveRedirectUrl(req, token, user) {
  const redirectUri = getRedirectUri(req);
  if (redirectUri) {
    return buildCallbackUrl(redirectUri, token, { email: user.email });
  }

  const ext = req.query.ext || req.body?.ext || 'Conquestcore.tursiops-ai';
  // Always generate the VS Code rollback link using authenticated user's email
  return buildVsCodeRollbackUrl(token, user.email, ext);
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
 * Creates a new user in Turso with name, email, password validation.
 * If redirect_uri is provided, executes an HTTP 302 redirect to the IDE deep link.
 * -------------------------------------------------------------------------
 */
router.post(['/signup', '/api/signup'], async (req, res, next) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    const redirectUri = getRedirectUri(req);

    // 1. Validate Input
    if (!email || !password) {
      if (req.accepts('html') && !req.xhr && !req.is('json')) {
        return res.status(400).send(renderAuthPage({
          mode: 'signup',
          redirectUri,
          error: 'Email and password are required.',
          name: name || '',
          email: email || '',
        }));
      }
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required.',
      });
    }

    // Validate Confirm Password if supplied
    if (confirmPassword !== undefined && confirmPassword !== password) {
      if (req.accepts('html') && !req.xhr && !req.is('json')) {
        return res.status(400).send(renderAuthPage({
          mode: 'signup',
          redirectUri,
          error: 'Passwords do not match. Please re-enter.',
          name: name || '',
          email,
        }));
      }
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Passwords do not match.',
      });
    }

    if (!isValidEmail(email)) {
      if (req.accepts('html') && !req.xhr && !req.is('json')) {
        return res.status(400).send(renderAuthPage({
          mode: 'signup',
          redirectUri,
          error: 'Please provide a valid email address.',
          name: name || '',
          email,
        }));
      }
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format.',
      });
    }

    if (password.length < 8) {
      if (req.accepts('html') && !req.xhr && !req.is('json')) {
        return res.status(400).send(renderAuthPage({
          mode: 'signup',
          redirectUri,
          error: 'Password must be at least 8 characters long.',
          name: name || '',
          email,
        }));
      }
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be at least 8 characters long.',
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
          name: name || '',
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

    // 4. Create User in Turso libSQL with Name
    const newUser = await createUser({
      name: name || null,
      email,
      passwordHash,
    });

    // 5. Generate secure JWT
    const token = generateToken(newUser);

    // 6. Handle Response / Deep Link Redirection
    const redirectUrl = resolveRedirectUrl(req, token, newUser);
    const vscodeLink = buildVsCodeRollbackUrl(token, newUser.email, req.query.ext || req.body?.ext || 'Conquestcore.tursiops-ai');

    if (isJsonRequest(req)) {
      return res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        },
        redirect_url: redirectUrl,
        vscode_link: vscodeLink,
      });
    }

    if (redirectUrl) {
      console.log(`[AUTH] User ${newUser.email} signed up. Redirecting 302 to: ${redirectUrl}`);
      return res.redirect(302, redirectUrl);
    }

    // Fallback: Standard Web Session Response
    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
      },
      redirect_url: redirectUrl,
      vscode_link: vscodeLink,
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
router.post(['/login', '/signin', '/api/login', '/api/signin'], async (req, res, next) => {
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
    const redirectUrl = resolveRedirectUrl(req, token, user);
    const vscodeLink = buildVsCodeRollbackUrl(token, user.email, req.query.ext || req.body?.ext || 'Conquestcore.tursiops-ai');

    if (isJsonRequest(req)) {
      return res.status(200).json({
        success: true,
        message: 'Authenticated successfully',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        redirect_url: redirectUrl,
        vscode_link: vscodeLink,
      });
    }

    if (redirectUrl) {
      console.log(`[AUTH] User ${user.email} logged in. Redirecting 302 to: ${redirectUrl}`);
      return res.redirect(302, redirectUrl);
    }

    // Normal web/API response
    return res.status(200).json({
      success: true,
      message: 'Authenticated successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      redirect_url: redirectUrl,
      vscode_link: vscodeLink,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * -------------------------------------------------------------------------
 * GET /api/vscode-link
 * Returns the official VS Code extension rollback link for the authenticated user.
 * -------------------------------------------------------------------------
 */
router.get(['/vscode-link', '/api/vscode-link', '/api/auth/vscode-link'], async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    const user = await findUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User Not Found', message: 'User does not exist in database' });
    }

    const rollbackUrl = buildVsCodeRollbackUrl(token, user.email, req.query.ext || req.body?.ext || 'Conquestcore.tursiops-ai');
    return res.json({
      success: true,
      email: user.email,
      vscode_link: rollbackUrl,
      redirect_url: rollbackUrl,
    });
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
});

/**
 * Helper to safely extract bearer token from authorization header
 */
function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  return authHeader.replace(/^Bearer\s+/i, '').trim();
}

/**
 * -------------------------------------------------------------------------
 * GET /api/user/gemini-key
 * Verifies JWT → looks up user in Turso → returns their stored key
 * -------------------------------------------------------------------------
 */
router.get(['/user/gemini-key', '/api/user/gemini-key', '/api/auth/user/gemini-key'], async (req, res) => {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (!payload) return res.status(401).json({ error: 'Invalid token' });

  const userId = payload.userId || payload.id || payload.sub;
  const email = payload.email || null;

  try {
    const key = await getUserGeminiKey(userId, email);
    return res.json({ geminiKey: key ?? null });
  } catch (err) {
    console.error('[GEMINI-KEY GET ERROR]', err);
    return res.status(500).json({ error: 'Failed to retrieve Gemini key' });
  }
});

/**
 * -------------------------------------------------------------------------
 * POST /api/user/gemini-key
 * Verifies JWT → saves Gemini key to Turso for the authenticated user
 * -------------------------------------------------------------------------
 */
router.post(['/user/gemini-key', '/api/user/gemini-key', '/api/auth/user/gemini-key'], async (req, res) => {
  const token = extractBearerToken(req);
  if (!token) return res.status(401).json({ error: 'No token' });

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (!payload) return res.status(401).json({ error: 'Invalid token' });

  const userId = payload.userId || payload.id || payload.sub;
  const email = payload.email || null;
  const geminiKey = req.body?.geminiKey ?? req.body?.gemini_key ?? null;

  try {
    await setUserGeminiKey(userId, geminiKey, email);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[GEMINI-KEY POST ERROR]', err);
    return res.status(500).json({ error: 'Failed to save Gemini key' });
  }
});

/**
 * -------------------------------------------------------------------------
 * POST /logout & GET /logout
 * Clears session and cookies
 * -------------------------------------------------------------------------
 */
router.all(['/logout', '/api/logout', '/api/auth/logout'], (req, res) => {
  res.clearCookie('token');
  res.clearCookie('tursiops_token');
  if (req.accepts('html') && !req.xhr && !req.is('json')) {
    return res.redirect('/signin');
  }
  return res.json({ success: true, message: 'Signed out successfully' });
});

/**
 * -------------------------------------------------------------------------
 * GET /login & GET /signup
 * -------------------------------------------------------------------------
 */
router.get(['/login', '/signin', '/api/login', '/api/signin'], (req, res) => {
  const redirectUri = getRedirectUri(req);
  res.send(renderAuthPage({
    mode: 'login',
    redirectUri,
    email: '',
  }));
});

router.get(['/signup', '/api/signup'], (req, res) => {
  const redirectUri = getRedirectUri(req);
  res.send(renderAuthPage({
    mode: 'signup',
    redirectUri,
    email: '',
  }));
});

/**
 * Helper to render server-side fallback auth page
 */
function renderAuthPage({ mode, redirectUri, error, name, email }) {
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
  <title>${title} | Tursiops</title>
  <link rel="stylesheet" href="style.css">
  <style>
    body { background-color: #070a10; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #0c111a; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 32px; width: 100%; max-width: 400px; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 13px; margin-bottom: 6px; color: #cbd5e1; }
    input { width: 100%; box-sizing: border-box; background: #06090e; border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 10px; color: #fff; }
    .btn-submit { width: 100%; background: #fff; color: #000; border: none; padding: 11px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-top: 10px; }
    .error { background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #fca5a5; padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="font-size: 26px;">🐬</span>
      <h2>${title}</h2>
    </div>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="${actionUrl}${queryParam}">
      ${redirectUri ? `<input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}">` : ''}
      ${!isLogin ? `
      <div class="form-group">
        <label for="name">Full Name</label>
        <input type="text" id="name" name="name" required placeholder="John Doe" value="${escapeHtml(name || '')}">
      </div>` : ''}
      <div class="form-group">
        <label for="email">Email Address</label>
        <input type="email" id="email" name="email" required placeholder="developer@domain.com" value="${escapeHtml(email || '')}">
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required placeholder="••••••••••••">
      </div>
      ${!isLogin ? `
      <div class="form-group">
        <label for="confirmPassword">Confirm Password</label>
        <input type="password" id="confirmPassword" name="confirmPassword" required placeholder="••••••••••••">
      </div>` : ''}
      <button type="submit" class="btn-submit">${isLogin ? 'Sign In' : 'Create Account'}</button>
    </form>
    <div class="auth-action-divider doto-font">
      <span>VS CODE EXTENSION ACTION</span>
    </div>
    <a href="#" class="btn btn-block btn-open-vscode locked doto-font" aria-disabled="true" style="text-align: center; text-decoration: none; justify-content: center;">
      <span>🔒</span> <span>OPEN IN VS CODE (${isLogin ? 'SIGN IN FIRST' : 'CREATE ACCOUNT FIRST'})</span>
    </a>
    <div class="vscode-unlock-hint doto-font" style="margin-top: 6px;">
      &gt; Complete ${isLogin ? 'sign in' : 'account creation'} above to unlock VS Code integration.
    </div>
    <div style="text-align: center; margin-top: 16px; font-size: 13px;">
      <a href="${toggleUrl}" style="color: #38bdf8; text-decoration: none;">${toggleText}</a>
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
