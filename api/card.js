// GET /api/cards/:id  (vercel.json rewrites it to /api/card?id=...)
const { blob, ID } = require("../lib/util");

module.exports = async (req, res) => {
  const id = String(req.query.id || "");
  if (!ID.test(id)) return res.status(404).json({ error: "not found" });
  try {
    const { list } = await blob();
    const { blobs } = await list({ prefix: `cards/${id}.json`, limit: 1 });
    if (!blobs.length || blobs[0].pathname !== `cards/${id}.json`) return res.status(404).json({ error: "not found" });
    const r = await fetch(blobs[0].url);
    if (!r.ok) throw new Error("read failed");
    const c = await r.json();
    res.setHeader("Cache-Control", "public, s-maxage=3600");
    res.json({ i: c.i, t: c.t, f: c.f, m: c.m, b: !!c.b, ps: c.ps || [] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
};
