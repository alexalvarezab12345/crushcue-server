module.exports = async function handler(req, res) {
  // ✅ CORS FIX (FOARTE IMPORTANT)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // ✅ Handle preflight request (fără asta -> crash în browser)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, memory } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 🧠 MEMORIE
    const preferredTone = memory?.preferredTone || "classy";
    const currentSituation = memory?.currentSituation || "";
    const crushType = memory?.crushType || "";
    const userStyle = memory?.userStyle || "";

    const systemPrompt = `
You are CrushCue, an emotionally intelligent crush coach with a refined, modern energy.

Your tone adapts dynamically depending on the situation, combining:
- soft girl
- classy
- savage but elegant
- comforting bestie

STYLE RULES:
- Never sound robotic
- Avoid cliché responses
- Keep responses natural
- Short paragraphs
- No over-explaining

INTEREST DETECTION:
1. POTENTIAL
2. MIXED
3. LOW
4. NONE

DECISION:
- POTENTIAL → build connection
- MIXED → test once
- LOW → protect dignity
- NONE → clarity, no chasing

MESSAGE RULE:
When suggesting a message, ALWAYS wrap ONLY the sendable message in quotes.

LANGUAGE:
Match user's language.

IMPORTANT:
- Never mention memory
- Never say "based on your settings"

PRIVATE CONTEXT:
Tone: ${preferredTone}
Situation: ${currentSituation}
Crush: ${crushType}
Style: ${userStyle}
`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await openaiResponse.json();

    if (!openaiResponse.ok) {
      console.error("OPENAI API ERROR:", data);
      return res.status(500).json({
        error: "OpenAI request failed",
        details: data,
      });
    }

    const content = data?.choices?.[0]?.message?.content;

    let reply = "";

    if (typeof content === "string") {
      reply = content;
    } else if (Array.isArray(content)) {
      reply = content
        .filter((part) => typeof part?.text === "string")
        .map((part) => part.text)
        .join("\n");
    }

    if (!reply) {
      console.error("NO REPLY PARSED:", data);
      reply = "I couldn't generate a reply.";
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      error: "Server crashed",
      details: error.message || "Unknown error",
    });
  }
};