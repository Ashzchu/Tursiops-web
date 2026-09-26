/**
 * Authentication Utilities: Password Hashing, JWT Management, and Deep Link Builders
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'tursiops_super_secret_jwt_key_2026_dev_prod';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 10;

/**
 * Hashes a plain-text password using bcrypt.
 * @param {string} password
 * @returns {Promise<string>} hashed password
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plain-text password against a bcrypt hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>} true if match, false otherwise
 */
export async function verifyPassword(password, hash) {
  if (!password || !hash) {
    return false;
  }
  return await bcrypt.compare(password, hash);
}

/**
 * Generates a signed JSON Web Token (JWT) for an authenticated user.
 * @param {Object} user
 * @param {string} user.id
 * @param {string} user.email
 * @returns {string} signed JWT token
 */
export function generateToken(user) {
  const payload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    iss: 'tursiops-auth',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verifies and decodes a JWT token.
 * @param {string} token
 * @returns {Object} decoded JWT payload
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Constructs the IDE deep link callback URL.
 * Appends the generated JWT as `token=${jwt_token}`.
 * Safely handles whether the redirect_uri already contains query parameters or not.
 * 
 * Example:
 *   buildCallbackUrl("vscode://ashzchu.tursiops/auth", "ey...")
 *   => "vscode://ashzchu.tursiops/auth?token=ey..."
 * 
 *   buildCallbackUrl("vscode://ashzchu.tursiops/auth?env=prod", "ey...")
 *   => "vscode://ashzchu.tursiops/auth?env=prod&token=ey..."
 * 
 * @param {string} redirectUri - The dynamic deep link (e.g. vscode://..., cursor://...)
 * @param {string} token - The signed JWT token
 * @param {Object} [extraParams={}] - Optional additional params to append
 * @returns {string} Fully formed redirect URL
 */
export function buildCallbackUrl(redirectUri, token, extraParams = {}) {
  if (!redirectUri) {
    throw new Error('redirect_uri is required to build a callback URL');
  }

  // Handle URL query formatting safely
  const url = new URL(redirectUri, 'http://localhost'); // base fallback if custom protocol
  const isCustomProtocol = !redirectUri.startsWith('http://') && !redirectUri.startsWith('https://');

  if (isCustomProtocol) {
    // For custom protocols like vscode:// or cursor://
    const separator = redirectUri.includes('?') ? '&' : '?';
    const params = new URLSearchParams();
    params.set('token', token);

    for (const [key, val] of Object.entries(extraParams)) {
      if (val !== undefined && val !== null) {
        params.set(key, val);
      }
    }

    return `${redirectUri}${separator}${params.toString()}`;
  } else {
    // Standard web URL
    const parsed = new URL(redirectUri);
    parsed.searchParams.set('token', token);
    for (const [key, val] of Object.entries(extraParams)) {
      if (val !== undefined && val !== null) {
        parsed.searchParams.set(key, val);
      }
    }
    return parsed.toString();
  }
}
