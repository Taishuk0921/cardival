// POST /api/cards  - save a personalized card (up to 4 JPEG photos with position and size)
const { crypto, blob, clip, num, limited } = require("../lib/util");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "method" });
  if (limited(req, "cards", 20)) return res.status(429).json({ error: "slow down" });
  try {
    const b = req.body && typeof req.body === "object" ? req.body : {};
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
    const { put } = await blob();
    const urls = await Promise.all(pics.map((p, k) =>
      put(`photos/${id}-${k}.jpg`, p.buf, { access: "public", contentType: "image/jpeg", addRandomSuffix: false }).then((r) => r.url)));
    const card = { i, t: clip(b.t, 40), f: clip(b.f, 40), m: clip(b.m, 240), b: !!b.b, fo: ["clean", "round", "classic"].includes(b.fo) ? b.fo : "clean", ik: ["white", "dark", "gold"].includes(b.ik) ? b.ik : "white", ps: pics.map((p, k) => ({ u: urls[k], x: p.x, y: p.y, w: p.w })) };
    await put(`cards/${id}.json`, JSON.stringify(card), { access: "public", contentType: "application/json", addRandomSuffix: false });
    res.status(201).json({ id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
};
