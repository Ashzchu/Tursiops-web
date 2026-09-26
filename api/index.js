/**
 * Vercel Serverless Function
 * Handles API requests and routes through the Express application.
 */
import app from '../server.js';

export default function handler(req, res) {
  return app(req, res);
}
