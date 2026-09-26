/**
 * Tursiops Authentication Server
 * Provides VS Code Deep Link Authentication backed by Turso libSQL
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { initDb } from './server/db.js';
import authRoutes from './server/routes/auth.js';
import { verifyToken } from './server/utils/auth.js';
import { findUserById } from './server/db.js';

dotenv.config();

// Fail fast if required environment variables are missing
const _required = ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'JWT_SECRET'];
_required.forEach(key => {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet());

// CORS — restrict to known origins
const allowedOrigins = [
  'https://tursiops-web.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl, VS Code extension)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST'],
  credentials: true,
}));

// Rate limiter for auth endpoints — 20 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});
app.use('/api/auth', authLimiter);
app.use('/login', authLimiter);
app.use('/signup', authLimiter);

// Body parsing — 10 kb limit to prevent oversized payloads
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Serve frontend static landing page files (index.html, style.css, app.js)
app.use(express.static(__dirname));

// Direct page route aliases for Vercel & local development
// Each route serves its own dedicated HTML file
app.get('/', (req, res, next) => {
  if (req.accepts('html')) return res.sendFile(path.join(__dirname, 'index.html'));
  next();
});
app.get('/landing', (req, res, next) => {
  if (req.accepts('html')) return res.sendFile(path.join(__dirname, 'landing.html'));
  next();
});
app.get('/signup', (req, res, next) => {
  if (req.accepts('html')) return res.sendFile(path.join(__dirname, 'signup.html'));
  next();
});
app.get(['/signin', '/login'], (req, res, next) => {
  if (req.accepts('html')) return res.sendFile(path.join(__dirname, 'signin.html'));
  next();
});

// Mount Auth Endpoints: /signup and /login
app.use('/', authRoutes);

// Also alias under /api/auth for programmatic REST clients
app.use('/api/auth', authRoutes);

/**
 * GET /api/me
 * Protected verification endpoint for VS Code extension to validate JWT tokens
 */
app.get('/api/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    const user = await findUserById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User Not Found', message: 'User does not exist in Turso vault' });
    }

    return res.json({
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'tursiops-auth-server',
    turso: process.env.TURSO_DATABASE_URL ? 'connected' : 'local-fallback',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler — must come after all routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Centralized Error Handler — never leak internal error messages to the client
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err);
  const status = err.status || 500;
  // Only expose message for known, explicitly-set client errors (4xx)
  if (status < 500) {
    return res.status(status).json({ error: err.message || 'Bad request' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Start Server and Initialize Database (local dev only)
// On Vercel, api/index.js imports this module — we skip listen()
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

async function start() {
  try {
    await initDb();
    if (!isVercel) {
      app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🐬 TURSIOPS AUTH SERVER RUNNING ON PORT ${PORT}`);
        console.log(`- Base URL:    http://localhost:${PORT}`);
        console.log(`- Landing:     http://localhost:${PORT}/landing`);
        console.log(`- Sign In:     http://localhost:${PORT}/signin`);
        console.log(`- Sign Up:     http://localhost:${PORT}/signup`);
        console.log(`====================================================`);
      });
    }
  } catch (err) {
    console.error('Fatal error starting server:', err);
    if (!isVercel) process.exit(1);
  }
}

start();

export default app;

