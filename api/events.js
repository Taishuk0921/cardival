// GET /api/events - upcoming festivals from iCal calendars (Google Calendar "public address in iCal format")
const CAL_URLS = (process.env.CALENDAR_ICS_URLS || "https://www.bangladatetoday.com/api/ical/holidays-bd.ics")
  .split(",").map((s) => s.trim()).filter(Boolean);

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

module.exports = async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const last = new Date(Date.now() + 150 * 864e5).toISOString().slice(0, 10);
  let all = [];
  try {
    for (const u of CAL_URLS) {
      const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
      if (r.ok) all.push(...parseICS(await r.text()));
    }
  } catch (e) { /* calendar unreachable: show nothing */ }
  const seen = new Set();
  const list = all.filter((e) => e.date >= today && e.date <= last)
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((e) => { const k = e.date + e.name; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 8);
  res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400"); // refreshed every 6 hours
  res.json(list);
};
