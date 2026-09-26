/**
 * Database client and schema management for Turso (libSQL)
 * Supports columns: s_no (Auto-increment PK), Email, Name, Passw, password_hash, gemini_key, id
 */
import { createClient } from '@libsql/client/web';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const defaultUrl = 'libsql://tursiops-ashzchu.aws-ap-south-1.turso.io';
const defaultAuthToken = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA0NDk5MTgsImlkIjoiMDFhMGRmMjEtODUwMS03MGMyLWJlODEtNDI1YzE2ZDYzZjg3Iiwia2lkIjoiM25VdmtERTU0U2Z3U1JkczZ5NWE2Rkw0Tzh6UEFBMDFFUGhmZlRCZWNrMCIsInJpZCI6IjY0ODc0NjQyLTdhY2EtNDExMS1iOWEzLWU3OWM1ZGZkOTE3NSJ9.Ga2F-M7R34SzCjqXpuPnhD7I48qm21hha7jrFyWksAZzrZEpIFsJJ0rqlmgy1tYPLDI9cLTdjoC1pb-jg1q6DA';
const url = process.env.TURSO_DATABASE_URL || defaultUrl;
const authToken = process.env.TURSO_AUTH_TOKEN || defaultAuthToken;

if (!process.env.TURSO_DATABASE_URL) {
  console.warn('[WARN] TURSO_DATABASE_URL not set in environment variables. Using default remote URL:', url);
}

/**
 * Turso libSQL Client instance (Web standard / fetch-based for serverless compatibility)
 */
export const db = createClient({
  url,
  authToken: authToken || undefined,
});

/**
 * Initializes the database schema.
 * Ensures the `users` table has:
 *  - s_no INTEGER PRIMARY KEY AUTOINCREMENT
 *  - Email TEXT UNIQUE NOT NULL
 *  - Name TEXT
 *  - Passw TEXT NOT NULL
 *  - password_hash TEXT
 *  - gemini_key TEXT
 *  - id TEXT
 *  - created_at DATETIME
 *  - updated_at DATETIME
 */
export async function initDb() {
  try {
    console.log('[DB] Checking and initializing database schema on Turso...');

    // 1. Create table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        s_no INTEGER PRIMARY KEY AUTOINCREMENT,
        Email TEXT UNIQUE NOT NULL,
        Name TEXT,
        Passw TEXT NOT NULL,
        password_hash TEXT,
        gemini_key TEXT,
        id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Migration safety check for existing columns
    try {
      const pragma = await db.execute(`PRAGMA table_info(users);`);
      const cols = pragma.rows.map(r => r.name);

      if (!cols.includes('s_no') || !cols.includes('Passw')) {
        console.log('[DB] Migrating existing table to include s_no and Passw columns...');
        await db.execute(`
          CREATE TABLE IF NOT EXISTS users_temp (
            s_no INTEGER PRIMARY KEY AUTOINCREMENT,
            Email TEXT UNIQUE NOT NULL,
            Name TEXT,
            Passw TEXT NOT NULL,
            password_hash TEXT,
            gemini_key TEXT,
            id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        try {
          await db.execute(`
            INSERT INTO users_temp (id, Email, Name, Passw, password_hash, created_at, updated_at)
            SELECT id, email, name, password_hash, password_hash, created_at, updated_at
            FROM users;
          `);
        } catch (copyErr) {
          console.log('[DB] Note on migration insert:', copyErr.message);
        }

        await db.execute(`DROP TABLE users;`);
        await db.execute(`ALTER TABLE users_temp RENAME TO users;`);
      }

      if (!cols.includes('gemini_key')) {
        try {
          await db.execute(`ALTER TABLE users ADD COLUMN gemini_key TEXT;`);
        } catch (e) {
          // ignore if already added
        }
      }
    } catch (migErr) {
      console.warn('[DB] Schema pragma check warning:', migErr.message);
    }

    // Index on email for fast lookups
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(Email);
    `);

    console.log('[DB] Schema verified successfully. `users` table is ready (s_no, Email, Name, Passw).');
  } catch (error) {
    console.error('[DB] Failed to initialize database schema:', error);
    throw error;
  }
}

/**
 * Normalizes a database row to a standard user object
 */
function normalizeUserRow(row) {
  if (!row) return null;
  return {
    s_no: row.s_no,
    id: row.id || (row.s_no !== undefined ? String(row.s_no) : null),
    name: row.Name ?? row.name ?? null,
    email: row.Email ?? row.email,
    passw: row.Passw ?? row.passw ?? row.password_hash,
    password_hash: row.Passw ?? row.password_hash,
    gemini_key: row.gemini_key ?? null,
    created_at: row.created_at,
  };
}

/**
 * Finds a user by email address (case-insensitive)
 * @param {string} email
 * @returns {Promise<Object|null>} user record or null
 */
export async function findUserByEmail(email) {
  if (!email) return null;
  const normalizedEmail = email.trim().toLowerCase();
  const result = await db.execute({
    sql: 'SELECT s_no, Email, Name, Passw, password_hash, gemini_key, id, created_at FROM users WHERE LOWER(Email) = ? LIMIT 1',
    args: [normalizedEmail],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return normalizeUserRow(result.rows[0]);
}

/**
 * Finds a user by ID or s_no
 * @param {string|number} idOrSNo
 * @returns {Promise<Object|null>} user record or null
 */
export async function findUserById(idOrSNo) {
  if (!idOrSNo) return null;
  const idStr = String(idOrSNo);
  const result = await db.execute({
    sql: 'SELECT s_no, Email, Name, Passw, password_hash, gemini_key, id, created_at FROM users WHERE id = ? OR CAST(s_no AS TEXT) = ? LIMIT 1',
    args: [idStr, idStr],
  });

  if (result.rows.length === 0) {
    return null;
  }

  return normalizeUserRow(result.rows[0]);
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

  const result = await db.execute({
    sql: `
      INSERT INTO users (Email, Name, Passw, password_hash, id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    args: [normalizedEmail, sanitizedName, passwordHash, passwordHash, userId],
  });

  const s_no = result.lastInsertRowid !== undefined ? Number(result.lastInsertRowid) : null;

  return {
    s_no,
    id: userId,
    name: sanitizedName,
    email: normalizedEmail,
  };
}

/**
 * Fetches the user's stored Gemini API key
 * @param {string|number} idOrEmail
 * @returns {Promise<string|null>}
 */
export async function getGeminiKey(idOrEmail) {
  if (!idOrEmail) return null;
  const target = String(idOrEmail).trim();
  const isEmail = target.includes('@');
  const user = isEmail ? await findUserByEmail(target) : await findUserById(target);
  return user?.gemini_key || null;
}

/**
 * Stores or updates the user's Gemini API key
 * @param {string|number} idOrEmail
 * @param {string} key
 * @returns {Promise<boolean>}
 */
export async function saveGeminiKey(idOrEmail, key) {
  if (!idOrEmail) return false;
  const target = String(idOrEmail).trim();
  const cleanKey = key ? key.trim() : null;

  await db.execute({
    sql: `
      UPDATE users
      SET gemini_key = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? OR CAST(s_no AS TEXT) = ? OR LOWER(Email) = LOWER(?)
    `,
    args: [cleanKey, target, target, target],
  });

  return true;
}

