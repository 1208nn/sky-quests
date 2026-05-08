export default {
  async fetch(r, e) {
    const u = new URL(r.url);
    const L = u.searchParams.get("lang") || "zh";
    const k = "quests-" + L;
    const d = new Date()
      .toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
      .split(",")[0]
      .split("/");
    const t = `${d[2]}-${d[0]}-${d[1]}`;
    const C = await e.KV.get(k);
    if (C) {
      const o = JSON.parse(C);
      if (o.date === t)
        return new Response(JSON.stringify(o.quests, null, 2), {
          headers: { "Content-Type": "application/json; charset=utf-8" },
        });
    }
    const h = await (
      await fetch("https://thatskyapplication.com/daily-guides", {
        headers: {
          "User-Agent": "Mozilla/5.0",
          Accept: "*/*",
          "Accept-Language": L,
          Referer: "https://thatskyapplication.com/",
        },
      })
    ).text();
    const q = [
      ...h.matchAll(
        /<(span|button)[^>]*(flex-1|regular-link)[^>]*>([^<]+)<\/(span|button)>/g,
      ),
    ]
      .map((m) => m[3].trim())
      .slice(0, 4);
    e.KV.put(k, JSON.stringify({ date: t, quests: q }));
    return new Response(JSON.stringify(q, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  },
};
