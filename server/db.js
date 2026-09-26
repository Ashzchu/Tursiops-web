/**
 * Database client and schema management for Turso (libSQL)
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.warn('[WARN] TURSO_DATABASE_URL is not set in environment variables.');
}

/**
 * Turso libSQL Client instance
 */
export const db = createClient({
  url: url || 'file:local.db',
  authToken: authToken || undefined,
});

/**
 * Initializes the database schema.
 * Creates the `users` table with id, name, email, and password_hash,
 * along with necessary indexes and migrations.
 */
export async function initDb() {
  try {
    console.log('[DB] Initializing database schema on Turso...');

    // Users table definition
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: add name column if table existed without it
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN name TEXT;`);
    } catch (e) {
      // Column already exists, safe to ignore
    }

    // Index on email for fast lookups
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    console.log('[DB] Schema initialized successfully. `users` table is ready.');
  } catch (error) {
    console.error('[DB] Failed to initialize database schema:', error);
    throw error;
  }
}

/**
 * Finds a user by email address (case-insensitive)
 * @param {string} email
 * @returns {Promise<Object|null>} user record or null
 */
export async function findUserByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await db.execute({
    sql: 'SELECT id, name, email, password_hash, created_at FROM users WHERE LOWER(email) = ? LIMIT 1',
    args: [normalizedEmail],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name || null,
    email: row.email,
    password_hash: row.password_hash,
    created_at: row.created_at,
  };
}

/**
 * Finds a user by ID
 * @param {string} id
 * @returns {Promise<Object|null>} user record or null
 */
export async function findUserById(id) {
  const result = await db.execute({
    sql: 'SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1',
    args: [id],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name || null,
    email: row.email,
    created_at: row.created_at,
  };
}

/**
 * Creates a new user record in Turso
 * @param {Object} params
 * @param {string} [params.name] developer name
 * @param {string} params.email
 * @param {string} params.passwordHash
 * @param {string} [params.id] optional custom ID
 * @returns {Promise<Object>} the newly created user object (excluding password hash)
 */
export async function createUser({ name = null, email, passwordHash, id = null }) {
  const userId = id || `usr_${randomUUID()}`;
  const normalizedEmail = email.trim().toLowerCase();
  const sanitizedName = name ? name.trim() : null;

  await db.execute({
    sql: `
      INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    args: [userId, sanitizedName, normalizedEmail, passwordHash],
  });

  return {
    id: userId,
    name: sanitizedName,
    email: normalizedEmail,
  };
}
