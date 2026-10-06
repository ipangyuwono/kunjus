const crypto = require('crypto');

const buckets = new Map();

function getIP(req) {
  const fwd = req.headers && req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) return fwd.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function checkRateLimit(req, { limit = 5, windowMs = 10 * 60 * 1000 } = {}) {
  const ip = getIP(req);
  const key = `${ip}`;
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count += 1;
  buckets.set(key, entry);
  return {
    allowed: entry.count <= limit,
    retryAfterSec: entry.count <= limit ? 0 : Math.ceil((entry.resetAt - now) / 1000),
  };
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || '').trim().slice(0, 320));
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { getIP, checkRateLimit, isValidEmail, escapeHtml, hashToken };
