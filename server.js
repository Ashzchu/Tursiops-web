/**
 * Tursiops Authentication Server
 * Provides VS Code Deep Link Authentication backed by Turso libSQL
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb, findUserById, findUserByEmail, getGeminiKey, saveGeminiKey } from './server/db.js';
import authRoutes from './server/routes/auth.js';
import { verifyToken } from './server/utils/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lazy DB initialization middleware
app.use(async (req, res, next) => {
  try {
    await ensureDbReady();
  } catch (err) {
    console.error('[DB INIT WARNING]', err.message);
  }
  next();
});

// Serve frontend static landing page files (index.html, style.css, app.js)
app.use(express.static(__dirname));

// Mount Auth Endpoints: /signup and /login
app.use('/', authRoutes);

// Also alias under /api/auth for programmatic REST clients
app.use('/api/auth', authRoutes);

/**
 * Helper to extract token from Authorization header, query, or custom header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1].trim();
  }
  if (req.headers['x-auth-token']) {
    return String(req.headers['x-auth-token']).trim();
  }
  if (req.query && req.query.token) {
    return String(req.query.token).trim();
  }
  return null;
}

/**
 * GET /api/me
 * Protected verification endpoint for VS Code extension to validate JWT tokens
 */
app.get('/api/me', async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or malformed Authorization header' });
  }

  try {
    const decoded = verifyToken(token);
    const user = await findUserById(decoded.id || decoded.sub || decoded.s_no);

    if (!user) {
      return res.status(404).json({ error: 'User Not Found', message: 'User does not exist in Turso vault' });
    }

    return res.json({
      valid: true,
      user: {
        s_no: user.s_no,
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Token', message: err.message });
  }
});

/**
 * GET /api/gemini-key
 * Retrieves the stored Gemini API key for the authenticated user
 */
app.get('/api/gemini-key', async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Token required to fetch Gemini API key' });
  }

  try {
    const decoded = verifyToken(token);
    const user = await findUserById(decoded.id || decoded.sub || decoded.s_no);

    if (!user) {
      return res.status(404).json({ error: 'User Not Found', message: 'User not found in Turso' });
    }

    const key = await getGeminiKey(user.id);
    if (!key) {
      return res.status(200).json({ key: null, message: 'No Gemini API key stored yet' });
    }

    return res.json({
      key,
      geminiKey: key,
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Token', message: err.message });
  }
});

/**
 * POST /api/gemini-key
 * Updates the stored Gemini API key for the authenticated user
 */
app.post('/api/gemini-key', async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Token required to update Gemini API key' });
  }

  try {
    const decoded = verifyToken(token);
    const user = await findUserById(decoded.id || decoded.sub || decoded.s_no);

    if (!user) {
      return res.status(404).json({ error: 'User Not Found', message: 'User not found in Turso' });
    }

    const key = req.body.key || req.body.geminiKey || req.body.apiKey || req.body.gemini_key;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Bad Request', message: 'Gemini API key string is required' });
    }

    await saveGeminiKey(user.id, key);

    return res.json({
      success: true,
      message: 'Gemini API key saved to Turso database',
      key: key.trim(),
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid Token', message: err.message });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const { db } = await import('./server/db.js');
    await db.execute('SELECT 1');
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  res.json({
    status: 'ok',
    service: 'tursiops-auth-server',
    turso: dbStatus,
    env: {
      has_db_url: Boolean(process.env.TURSO_DATABASE_URL),
      has_auth_token: Boolean(process.env.TURSO_AUTH_TOKEN),
    },
    timestamp: new Date().toISOString(),
  });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

// Lazy DB initialization helper for serverless and local environments
let dbInitialized = false;
export async function ensureDbReady() {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
}

// Start Server and Initialize Database
async function start() {
  try {
    await ensureDbReady();
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🐬 TURSIOPS AUTH SERVER RUNNING ON PORT ${PORT}`);
      console.log(`- Web URL:     http://localhost:${PORT}`);
      console.log(`- Login:       http://localhost:${PORT}/login`);
      console.log(`- Signup:      http://localhost:${PORT}/signup`);
      console.log(`- Turso DB:    ${process.env.TURSO_DATABASE_URL}`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
}

// Automatically start if executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  start();
}

export default app;
