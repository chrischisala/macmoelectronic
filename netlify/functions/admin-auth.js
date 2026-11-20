/**
 * Netlify Serverless Function — MacMo HQ Stealth Vault Authentication Guard
 * Route: /.netlify/functions/admin-auth
 *
 * Security Features:
 * - Server-side per-IP brute-force protection (5 failed attempts = 15-minute IP ban)
 * - Constant-time cryptographic verification (crypto.timingSafeEqual)
 * - Supports custom MACMO_ADMIN_PASSWORD in Netlify Environment Variables
 */

const crypto = require('crypto');

const ipAttempts = new Map();
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 5;

// Pre-computed salted SHA-256 digests ('macmo-lusaka-auth-v2:' + password)
const ALLOWED_DIGESTS = [
  '7ff5635d4f27901d9669e358a6461c9b99d7c52e31a8b1f8cb868467c44c0685',
  '979319165cd714f9bff4551598c212378b4819565889e856b14ccb370e235574'
];

function safeCompareHex(hexA, hexB) {
  try {
    const bufA = Buffer.from(String(hexA || ''), 'hex');
    const bufB = Buffer.from(String(hexB || ''), 'hex');
    if (bufA.length !== bufB.length || bufA.length === 0) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

exports.handler = async function (event) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff'
  };

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const clientIp =
    (event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'])) || 'local';
  const ipKey = String(clientIp).split(',')[0].trim().slice(0, 64);
  const now = Date.now();

  const record = ipAttempts.get(ipKey) || { fails: 0, lockedUntil: 0 };
  if (record.lockedUntil > now) {
    const minsLeft = Math.ceil((record.lockedUntil - now) / 60000);
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        authenticated: false,
        locked: true,
        error: `Security Lockout: Too many failed attempts from your network. Locked for ${minsLeft} minute(s).`
      })
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ authenticated: false, error: 'Invalid request' }) };
  }

  const email = String(body.email || '').trim();
  const password = String(body.password || '').trim();

  if (!email || !password || email.length > 120 || password.length > 128) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ authenticated: false, error: 'Email and password are required.' })
    };
  }

  // 1. Check custom Netlify env var MACMO_ADMIN_PASSWORD if configured
  let isAuthorized = false;
  if (process.env.MACMO_ADMIN_PASSWORD) {
    const expectedHash = crypto.createHash('sha256').update('macmo-env:' + process.env.MACMO_ADMIN_PASSWORD).digest('hex');
    const candidateHash = crypto.createHash('sha256').update('macmo-env:' + password).digest('hex');
    if (safeCompareHex(expectedHash, candidateHash)) {
      isAuthorized = true;
    }
  }

  // 2. Check salted SHA-256 owner digests
  if (!isAuthorized) {
    const candidateDigest = crypto
      .createHash('sha256')
      .update('macmo-lusaka-auth-v2:' + password)
      .digest('hex');
    for (const digest of ALLOWED_DIGESTS) {
      if (safeCompareHex(digest, candidateDigest)) {
        isAuthorized = true;
        break;
      }
    }
  }

  if (!isAuthorized) {
    record.fails += 1;
    if (record.fails >= MAX_FAILED_ATTEMPTS) {
      record.lockedUntil = now + LOCKOUT_WINDOW_MS;
    }
    ipAttempts.set(ipKey, record);
    const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.fails);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        authenticated: false,
        error:
          remaining > 0
            ? `Invalid credentials. ${remaining} attempt(s) remaining before 15-minute IP lockout.`
            : 'Security Lockout: Too many failed attempts. Your IP is locked for 15 minutes.'
      })
    };
  }

  // Reset failed counter on success
  ipAttempts.delete(ipKey);
  const sessionToken = crypto.randomBytes(24).toString('hex');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      authenticated: true,
      user: email,
      token: sessionToken
    })
  };
};

