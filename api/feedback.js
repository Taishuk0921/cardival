// POST /api/feedback  - save feedback (visitors)      GET /api/feedback - read it (developers, needs x-admin-key)
const { blob, clip, isAdmin, limited } = require("../lib/util");
const WEBHOOK = process.env.FEEDBACK_WEBHOOK_URL || ""; // optional Discord/Slack webhook

module.exports = async (req, res) => {
  try {
    if (req.method === "POST") {
      if (limited(req, "fb", 10)) return res.status(429).json({ error: "slow down" });
      const b = req.body && typeof req.body === "object" ? req.body : {};
      const text = clip(b.feedback, 1000), contact = clip(b.contact, 80);
      if (!text) return res.status(400).json({ error: "empty" });
      const { put } = await blob();
      // random suffix: the stored file's address cannot be guessed
      await put(`feedback/${Date.now()}.json`, JSON.stringify({ text, contact, at: new Date().toISOString() }),
        { access: "public", contentType: "application/json", addRandomSuffix: true });
      if (WEBHOOK) {
        const msg = ("New Cardival feedback:\n" + text + (contact ? "\nContact: " + contact : "")).slice(0, 1900);
        await fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: msg, text: msg }), signal: AbortSignal.timeout(4000) }).catch(() => {});
      }
      return res.status(201).json({ ok: true });
    }
    if (req.method === "GET") {
      if (!isAdmin(req)) return res.status(401).json({ error: "unauthorized" });
      const { list } = await blob();
      let all = [], cursor;
      do {
        const r = await list({ prefix: "feedback/", limit: 1000, cursor });
        all.push(...r.blobs); cursor = r.hasMore ? r.cursor : undefined;
      } while (cursor && all.length < 3000);
      all.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      const items = (await Promise.all(all.slice(0, 200).map((x) => fetch(x.url).then((r) => r.json()).catch(() => null)))).filter(Boolean);
      res.setHeader("Cache-Control", "no-store");
      return res.json(items);
    }
    res.status(405).json({ error: "method" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server error" });
  }
};
