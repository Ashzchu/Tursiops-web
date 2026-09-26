/**
 * Vercel Serverless Function
 * Re-exports the Express app so Vercel can route
 * API requests (POST /signup, POST /login, GET /api/me, etc.)
 * through the Express middleware stack.
 *
 * Note: env var startup validation is performed in server.js after dotenv.config()
 */
import app from '../server.js';

export default app;
