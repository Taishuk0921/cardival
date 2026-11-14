const crypto = require("crypto");

// @vercel/blob is loaded with import() so it works in any module setup
const blob = () => import("@vercel/blob");
const clip = (s, n) => String(s || "").trim().slice(0, n);
const num = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));
const ID = /^[\w-]{6,12}$/;

// Admin check: the request must send the header  x-admin-key  with your ADMIN_KEY
function isAdmin(req) {
  const given = Buffer.from(String(req.headers["x-admin-key"] || ""));
  const real = Buffer.from(process.env.ADMIN_KEY || "");
  return real.length > 0 && given.length === real.length && crypto.timingSafeEqual(given, real);
}

// Simple limiter (best effort: serverless instances do not share memory)
const hits = new Map();
function limited(req, name, max) {
  const ip = String(req.headers["x-forwarded-for"] || "x").split(",")[0].trim();
  const key = name + ip, now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < 60000);
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

module.exports = { crypto, blob, clip, num, ID, isAdmin, limited };
