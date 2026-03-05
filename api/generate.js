export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const { trend, tone } = req.body || {};
  if (!trend) return res.status(400).json({ error: "Missing trend" });

  const styles = {
    witty: "Be witty and clever with wordplay.",
    informative: "Lead with the most interesting fact.",
    "hot-take": "Give a bold opinionated hot take.",
    question: "Ask one thought-provoking question.",
    thread: "Start with 🧵 as a thread opener.",
    breaking: "Write as urgent breaking news with 🚨.",
  };

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: `Write 3 tweets about: "${trend}"\nStyle: ${styles[tone] || styles.witty}\nRules: under 260 chars each, max 2 hashtags, sound human, all 3 different.\nReply with ONLY a JSON array: ["tweet 1", "tweet 2", "tweet 3"]`
        }],
      }),
    });

    const d = await r.json();
    if (d.error) return res.status(500).json({ error: d.error.message, type: d.error.type });

    const raw = d.content.filter(b => b.type === "text").map(b => b.text).join("").trim()
      .replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "");
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return res.status(500).json({ error: "Parse failed", raw: raw.slice(0, 200) });

    return res.status(200).json({ tweets: JSON.parse(match[0]) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
