export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

  const category = req.query.category || "top";
  const topics = {
    top: "top news headlines today",
    technology: "technology and AI news today",
    business: "business and finance news today",
    entertainment: "entertainment news today",
    world: "world news today",
    health: "health and science news today",
  };

  const date = new Date().toDateString();
  let messages = [{
    role: "user",
    content: `Today is ${date}. Search for "${topics[category] || topics.top}". Return ONLY a JSON array of 6 news items, no other text:\n[{"title":"...","source":"...","url":"...","publishedAt":"..."}]`
  }];

  try {
    let finalText = "";
    for (let i = 0; i < 10; i++) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 2000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages,
        }),
      });

      const d = await r.json();
      if (d.error) return res.status(500).json({ error: d.error.message, type: d.error.type });

      messages.push({ role: "assistant", content: d.content });

      if (d.stop_reason === "end_turn") {
        finalText = d.content.filter(b => b.type === "text").map(b => b.text).join("");
        break;
      }

      if (d.stop_reason === "tool_use") {
        const results = d.content
          .filter(b => b.type === "tool_use")
          .map(b => ({ type: "tool_result", tool_use_id: b.id, content: "" }));
        messages.push({ role: "user", content: results });
      } else {
        finalText = d.content.filter(b => b.type === "text").map(b => b.text).join("");
        break;
      }
    }

    const match = finalText.match(/\[[\s\S]*?\]/);
    if (!match) return res.status(500).json({ error: "No JSON found", raw: finalText.slice(0, 200) });

    return res.status(200).json({ articles: JSON.parse(match[0]) });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
