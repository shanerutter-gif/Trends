export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const key = process.env.GUARDIAN_API_KEY;
  if (!key) return res.status(500).json({ error: "GUARDIAN_API_KEY not set in Vercel environment variables" });

  const category = req.query.category || "top";

  // Guardian API section mapping
  const sections = {
    top:           "",                    // no section filter = top news
    technology:    "technology",
    business:      "business",
    entertainment: "culture",
    world:         "world",
    health:        "society",
  };

  const section = sections[category];
  let url = `https://content.guardianapis.com/search?api-key=${key}&show-fields=trailText&page-size=8&order-by=newest`;
  if (section) url += `&section=${section}`;

  try {
    const r = await fetch(url);
    const d = await r.json();

    if (d.response?.status !== "ok") {
      return res.status(500).json({ error: "Guardian API error: " + JSON.stringify(d) });
    }

    const articles = (d.response.results || []).map(a => ({
      title: a.webTitle,
      source: "The Guardian",
      url: a.webUrl,
      publishedAt: a.webPublicationDate,
    }));

    return res.status(200).json({ articles });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
