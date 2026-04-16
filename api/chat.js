module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
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

    return res.status(200).json({
      reply: data.output_text || "I couldn't generate a reply.",
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      error: "Server crashed",
      details: error.message || "Unknown error",
    });
  }
};