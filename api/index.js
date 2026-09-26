/**
 * Vercel Serverless Function
 * Re-exports the Express app so Vercel can route
 * API requests (POST /signup, POST /login, GET /api/me, etc.)
 * through the Express middleware stack.
 */
import app from '../server.js';

export default app;
