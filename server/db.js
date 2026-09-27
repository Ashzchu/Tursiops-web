/**
 * Database client and schema management for Turso (libSQL)
 *
 * Remote schema (tursiops-ashzchu.aws-ap-south-1.turso.io):
 *   s_no        INTEGER PRIMARY KEY (auto-increment)
 *   Email       TEXT NOT NULL UNIQUE
 *   Name        TEXT
 *   Passw       TEXT NOT NULL  ← bcrypt password hash
 *   password_hash TEXT         ← legacy duplicate of Passw (kept for compat)
 *   gemini_key  TEXT
 *   id          TEXT           ← usr_<uuid> application-level ID
 *   created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
 *   updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
 */
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || 'libsql://tursiops-ashzchu.aws-ap-south-1.turso.io';
const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA0NDk5MTgsImlkIjoiMDFhMGRmMjEtODUwMS03MGMyLWJlODEtNDI1YzE2ZDYzZjg3Iiwia2lkIjoiM25VdmtERTU0U2Z3U1JkczZ5NWE2Rkw0Tzh6UEFBMDFFUGhmZlRCZWNrMCIsInJpZCI6IjY0ODc0NjQyLTdhY2EtNDExMS1iOWEzLWU3OWM1ZGZkOTE3NSJ9.Ga2F-M7R34SzCjqXpuPnhD7I48qm21hha7jrFyWksAZzrZEpIFsJJ0rqlmgy1tYPLDI9cLTdjoC1pb-jg1q6DA';

/**
 * Turso libSQL Client instance
 */
export const db = createClient({
  url,
  authToken: authToken || undefined,
});

/**
 * Initializes the database schema.
 * Safe to run on every startup — uses CREATE TABLE IF NOT EXISTS.
 */
export async function initDb() {
  try {
    console.log('[DB] Initializing database schema on Turso...');

    // Create table matching the existing remote schema
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        s_no        INTEGER PRIMARY KEY AUTOINCREMENT,
        Email       TEXT UNIQUE NOT NULL,
        Name        TEXT,
        Passw       TEXT NOT NULL,
        password_hash TEXT,
        gemini_key  TEXT,
        id          TEXT,
        created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Index on Email for fast lookups
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(Email);
    `);

    console.log('[DB] Schema initialized successfully. `users` table is ready.');
  } catch (error) {
    console.error('[DB] Failed to initialize database schema:', error);
    throw error;
  }
}

/**
 * Finds a user by email address (case-insensitive).
 * Returns the internal shape the auth routes expect:
 *   { id, name, email, password_hash, created_at }
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
export async function findUserByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const result = await db.execute({
    sql: 'SELECT id, Name, Email, Passw, created_at FROM users WHERE LOWER(Email) = ? LIMIT 1',
    args: [normalizedEmail],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.Name || null,
    email: row.Email,
    password_hash: row.Passw,   // normalised field name for the rest of the codebase
    created_at: row.created_at,
  };
}

/**
 * Finds a user by application ID (usr_<uuid>).
 * Does NOT return the password hash.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function findUserById(id) {
  const result = await db.execute({
    sql: 'SELECT id, Name, Email, created_at FROM users WHERE id = ? LIMIT 1',
    args: [id],
  });

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.Name || null,
    email: row.Email,
    created_at: row.created_at,
  };
}

/**
 * Creates a new user record in Turso.
 * Writes to both Passw (NOT NULL constraint) and password_hash (legacy compat).
 * @param {Object} params
 * @param {string} [params.name]
 * @param {string} params.email
 * @param {string} params.passwordHash  bcrypt hash
 * @param {string} [params.id]  optional custom ID
 * @returns {Promise<Object>} newly created user (no password hash)
 */
export async function createUser({ name = null, email, passwordHash, id = null }) {
  const userId = id || `usr_${randomUUID()}`;
  const normalizedEmail = email.trim().toLowerCase();
  const sanitizedName = name ? name.trim() : null;

  await db.execute({
    sql: `
      INSERT INTO users (id, Name, Email, Passw, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    args: [userId, sanitizedName, normalizedEmail, passwordHash, passwordHash],
  });

  return {
    id: userId,
    name: sanitizedName,
    email: normalizedEmail,
  };
}

/**
 * Retrieves a user's stored Gemini API key by user ID and/or email.
 * @param {string} userId
 * @param {string} [email]
 * @returns {Promise<string|null>}
 */
export async function getUserGeminiKey(userId, email = null) {
  let result;
  const cleanEmail = email ? email.trim().toLowerCase() : null;

  if (userId && cleanEmail) {
    result = await db.execute({
      sql: 'SELECT gemini_key FROM users WHERE id = ? OR LOWER(Email) = ? LIMIT 1',
      args: [userId, cleanEmail],
    });
  } else if (userId) {
    result = await db.execute({
      sql: 'SELECT gemini_key FROM users WHERE id = ? LIMIT 1',
      args: [userId],
    });
  } else if (cleanEmail) {
    result = await db.execute({
      sql: 'SELECT gemini_key FROM users WHERE LOWER(Email) = ? LIMIT 1',
      args: [cleanEmail],
    });
  } else {
    return null;
  }

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].gemini_key ?? null;
}

/**
 * Updates a user's stored Gemini API key by user ID and/or email.
 * @param {string} userId
 * @param {string|null} geminiKey
 * @param {string} [email]
 * @returns {Promise<boolean>}
 */
export async function setUserGeminiKey(userId, geminiKey, email = null) {
  const sanitizedKey = geminiKey ? String(geminiKey).trim() : null;
  const cleanEmail = email ? email.trim().toLowerCase() : null;
  let result;

  if (userId && cleanEmail) {
    result = await db.execute({
      sql: 'UPDATE users SET gemini_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? OR LOWER(Email) = ?',
      args: [sanitizedKey, userId, cleanEmail],
    });
  } else if (userId) {
    result = await db.execute({
      sql: 'UPDATE users SET gemini_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [sanitizedKey, userId],
    });
  } else if (cleanEmail) {
    result = await db.execute({
      sql: 'UPDATE users SET gemini_key = ?, updated_at = CURRENT_TIMESTAMP WHERE LOWER(Email) = ?',
      args: [sanitizedKey, cleanEmail],
    });
  } else {
    return false;
  }

  return (result.rowsAffected || 0) > 0;
}

