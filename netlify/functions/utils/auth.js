const crypto = require('crypto');

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 heures
const COOKIE_NAME = 'bd_admin_session';

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET manquant dans les variables d\'environnement.');
  return secret;
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');
}

function createSessionCookie() {
  const expires = Date.now() + SESSION_DURATION_MS;
  const payload = `admin.${expires}`;
  const signature = sign(payload);
  const value = `${payload}.${signature}`;
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(val);
  });
  return out;
}

function isAuthenticated(event) {
  const cookies = parseCookies(event.headers.cookie || event.headers.Cookie);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return false;

  const lastDot = raw.lastIndexOf('.');
  if (lastDot === -1) return false;
  const payload = raw.slice(0, lastDot);
  const signature = raw.slice(lastDot + 1);

  let expected;
  try {
    expected = sign(payload);
  } catch (err) {
    return false;
  }

  const a = Buffer.from(signature, 'utf-8');
  const b = Buffer.from(expected, 'utf-8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  const [, expiresStr] = payload.split('.');
  const expires = parseInt(expiresStr, 10);
  if (!expires || Date.now() > expires) return false;

  return true;
}

function checkPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD || '';
  const a = Buffer.from(candidate || '', 'utf-8');
  const b = Buffer.from(expected, 'utf-8');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

module.exports = {
  createSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  checkPassword,
};
