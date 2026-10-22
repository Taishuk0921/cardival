const express = require("express");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA = process.env.DATA_DIR || path.join(__dirname, "data");
const ADMIN_KEY = process.env.ADMIN_KEY || "";
fs.mkdirSync(DATA, { recursive: true });

// --- tiny JSON-file store (fine for testing; move to a database later) ---
const fileOf = (n) => path.join(DATA, n + ".json");
function load(n, def) {
  try { return JSON.parse(fs.readFileSync(fileOf(n), "utf8")); } catch { return def; }
}
function save(n, v) {
  const tmp = fileOf(n) + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(v));
  fs.renameSync(tmp, fileOf(n));
}
const cards = load("cards", {});
const feedback = load("feedback", []);
const clip = (s, n) => String(s || "").trim().slice(0, n);

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));
app.use((req, res, next) => {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Frame-Options": "SAMEORIGIN",
  });
  next();
});

const apiLimit = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false });
const writeLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimit);

app.get("/api/health", (req, res) => res.json({ ok: true, cards: Object.keys(cards).length }));

// Save a personalized card, get a short id back
app.post("/api/cards", writeLimit, (req, res) => {
  const b = req.body || {};
  const i = Number(b.i);
  if (!Number.isInteger(i) || i < 1 || i > 500) return res.status(400).json({ error: "bad card" });
  const id = crypto.randomBytes(5).toString("base64url");
  cards[id] = { i, t: clip(b.t, 40), f: clip(b.f, 40), m: clip(b.m, 240), at: Date.now() };
  save("cards", cards);
  res.status(201).json({ id });
});

app.get("/api/cards/:id", (req, res) => {
  const c = cards[req.params.id];
  if (!c) return res.status(404).json({ error: "not found" });
  res.json({ i: c.i, t: c.t, f: c.f, m: c.m });
});

// Feedback from the form
app.post("/api/feedback", writeLimit, (req, res) => {
  const text = clip(req.body && req.body.feedback, 1000);
  if (!text) return res.status(400).json({ error: "empty" });
  feedback.push({ text, at: new Date().toISOString() });
  save("feedback", feedback);
  res.status(201).json({ ok: true });
});

// Read feedback (you only): curl -H "x-admin-key: KEY" https://yoursite/api/feedback
app.get("/api/feedback", (req, res) => {
  const given = Buffer.from(String(req.get("x-admin-key") || ""));
  const real = Buffer.from(ADMIN_KEY);
  if (!ADMIN_KEY || given.length !== real.length || !crypto.timingSafeEqual(given, real))
    return res.status(401).json({ error: "unauthorized" });
  res.json(feedback);
});

// Website
app.use(express.static(path.join(__dirname, "public"), { maxAge: "1h" }));
app.get("/c/:id", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.use((req, res) => res.status(404).send("Not found"));

app.listen(PORT, () => console.log("Cardival running on http://localhost:" + PORT));
