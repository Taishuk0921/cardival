const express = require("express");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const DATA = process.env.DATA_DIR || path.join(__dirname, "data");
const PHOTOS = path.join(DATA, "photos");
const ADMIN_KEY = process.env.ADMIN_KEY || "";
const WEBHOOK = process.env.FEEDBACK_WEBHOOK_URL || ""; // Discord/Slack webhook: feedback also arrives on your phone
// Calendars to read upcoming festivals from (iCal links, comma separated). Add your own Google Calendar's
// "Public address in iCal format" here and the website follows it automatically.
const CAL_URLS = (process.env.CALENDAR_ICS_URLS || "https://www.bangladatetoday.com/api/ical/holidays-bd.ics")
  .split(",").map((s) => s.trim()).filter(Boolean);
fs.mkdirSync(PHOTOS, { recursive: true });

// --- tiny JSON-file store (fine for testing; move to a database later) ---
const fileOf = (n) => path.join(DATA, n + ".json");
function load(n, def) { try { return JSON.parse(fs.readFileSync(fileOf(n), "utf8")); } catch { return def; } }
function save(n, v) { const t = fileOf(n) + ".tmp"; fs.writeFileSync(t, JSON.stringify(v)); fs.renameSync(t, fileOf(n)); }
const cards = load("cards", {});
const feedback = load("feedback", []);
const clip = (s, n) => String(s || "").trim().slice(0, n);
const ID = /^[\w-]{6,12}$/;

// --- calendar (iCal) reader ---
function parseICS(txt) {
  const lines = txt.replace(/\r/g, "").replace(/\n[ \t]/g, "").split("\n");
  const out = []; let ev = null;
  for (const l of lines) {
    if (l === "BEGIN:VEVENT") ev = {};
    else if (l === "END:VEVENT") { if (ev && ev.date && ev.name && !ev.rrule) out.push({ date: ev.date, name: ev.name }); ev = null; }
    else if (ev) {
      const i = l.indexOf(":"); if (i < 0) continue;
      const k = l.slice(0, i).split(";")[0], v = l.slice(i + 1);
      if (k === "SUMMARY") ev.name = v.replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\n/gi, " ").trim();
      else if (k === "DTSTART") { const m = v.match(/^(\d{4})(\d{2})(\d{2})/); if (m) ev.date = `${m[1]}-${m[2]}-${m[3]}`; }
      else if (k === "RRULE") ev.rrule = 1; // repeating events are skipped: add them as single events
    }
  }
  return out;
}
let evCache = { at: 0, list: [] };
async function loadEvents() {
  if (Date.now() - evCache.at < 6 * 3600e3) return evCache.list;
  try {
    const all = [];
    for (const u of CAL_URLS) {
      const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
      if (r.ok) all.push(...parseICS(await r.text()));
    }
    const today = new Date().toISOString().slice(0, 10);
    const last = new Date(Date.now() + 150 * 864e5).toISOString().slice(0, 10);
    const seen = new Set();
    const list = all.filter((e) => e.date >= today && e.date <= last)
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((e) => { const k = e.date + e.name; if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 8);
    evCache = { at: Date.now(), list };
  } catch (e) { evCache.at = Date.now() - 5 * 3600e3; } // keep old list, retry in about an hour
  return evCache.list;
}

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.set({ "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Frame-Options": "SAMEORIGIN" });
  next();
});
const apiLimit = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false });
const writeLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimit);

app.get("/api/health", (req, res) => res.json({ ok: true, cards: Object.keys(cards).length }));

// Save a personalized card (up to 4 JPEG photos, each with its position and size), get a short id back
const num = (v, lo, hi) => Math.min(hi, Math.max(lo, Number(v) || 0));
app.post("/api/cards", writeLimit, express.json({ limit: "3mb" }), (req, res) => {
  const b = req.body || {};
  const i = Number(b.i);
  if (!Number.isInteger(i) || i < 1 || i > 500) return res.status(400).json({ error: "bad card" });
  const pics = [];
  for (const q of Array.isArray(b.ps) ? b.ps.slice(0, 4) : []) {
    const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String((q && q.d) || ""));
    const buf = m && Buffer.from(m[1], "base64");
    if (!buf || buf.length > 450 * 1024 || buf[0] !== 0xff || buf[1] !== 0xd8) return res.status(400).json({ error: "bad photo" });
    pics.push({ buf, x: num(q.x, -20, 120), y: num(q.y, -20, 120), w: num(q.w, 5, 150) });
  }
  const id = crypto.randomBytes(5).toString("base64url");
  pics.forEach((p, k) => fs.writeFileSync(path.join(PHOTOS, id + "." + k + ".jpg"), p.buf));
  cards[id] = { i, t: clip(b.t, 40), f: clip(b.f, 40), m: clip(b.m, 240), b: !!b.b, ph: pics.map(({ x, y, w }) => ({ x, y, w })), at: Date.now() };
  save("cards", cards);
  res.status(201).json({ id });
});

app.get("/api/cards/:id", (req, res) => {
  const c = cards[req.params.id];
  if (!c) return res.status(404).json({ error: "not found" });
  const ps = (Array.isArray(c.ph) ? c.ph : []).map((q, k) => ({ u: "/photos/" + req.params.id + "/" + k + ".jpg", x: q.x, y: q.y, w: q.w }));
  res.json({ i: c.i, t: c.t, f: c.f, m: c.m, b: !!c.b, ps });
});

app.get("/photos/:id/:n.jpg", (req, res) => {
  const { id, n } = req.params;
  if (!ID.test(id) || !/^[0-3]$/.test(n)) return res.status(404).end();
  const f = path.join(PHOTOS, id + "." + n + ".jpg");
  if (!fs.existsSync(f)) return res.status(404).end();
  res.set("Cache-Control", "public, max-age=86400");
  res.sendFile(f);
});

// Upcoming festivals / events from the calendar
app.get("/api/events", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  res.set("Cache-Control", "public, max-age=1800");
  res.json((await loadEvents()).filter((e) => e.date >= today));
});

// Feedback: saved on the server, optionally also sent to your Discord/Slack webhook
app.post("/api/feedback", writeLimit, express.json({ limit: "10kb" }), (req, res) => {
  const text = clip(req.body && req.body.feedback, 1000), contact = clip(req.body && req.body.contact, 80);
  if (!text) return res.status(400).json({ error: "empty" });
  feedback.push({ text, contact, at: new Date().toISOString() });
  save("feedback", feedback);
  res.status(201).json({ ok: true });
  if (WEBHOOK) {
    const msg = ("New Cardival feedback:\n" + text + (contact ? "\nContact: " + contact : "")).slice(0, 1900);
    fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: msg, text: msg }), signal: AbortSignal.timeout(8000) }).catch(() => {});
  }
});

// Read feedback (developers only): header  x-admin-key: YOUR_KEY   (or open /admin in the browser)
app.get("/api/feedback", (req, res) => {
  const given = Buffer.from(String(req.get("x-admin-key") || "")), real = Buffer.from(ADMIN_KEY);
  if (!ADMIN_KEY || given.length !== real.length || !crypto.timingSafeEqual(given, real)) return res.status(401).json({ error: "unauthorized" });
  res.json([...feedback].reverse());
});

app.use(express.static(path.join(__dirname, "public"), {
  maxAge: "1h",
  setHeaders: (res, p) => { if (p.endsWith(".html")) res.set("Cache-Control", "no-cache"); },
}));
app.get("/c/:id", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));
app.use((err, req, res, next) => res.status(400).json({ error: "bad request" }));
app.use((req, res) => res.status(404).send("Not found"));

app.listen(PORT, () => console.log("Cardival running on http://localhost:" + PORT));
