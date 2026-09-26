/**
 * Vercel Serverless Function entrypoint
 */
import app, { ensureDbReady } from '../server.js';

export default async function handler(req, res) {
  try {
    await ensureDbReady();
  } catch (err) {
    console.error('[VERCEL INIT ERROR]', err);
  }
  return app(req, res);
}
