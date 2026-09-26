/**
 * Vercel Serverless Function Catch-All for /api/*
 * Handles /api/login, /api/signup, /api/me, /api/health, etc.
 */
import app from '../server.js';

export default function handler(req, res) {
  return app(req, res);
}
