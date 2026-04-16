const OpenAI = require("openai");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are CrushCue, an AI dating coach. Be helpful, confident, kind, realistic, and non-toxic.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return res.status(200).json({
      reply: response.output_text || "I couldn't generate a reply.",
    });
  } catch (error) {
    console.error("OPENAI / VERCEL ERROR:", error);
    return res.status(500).json({
      error: "Server crashed",
      details: error.message || "Unknown error",
    });
  }
};