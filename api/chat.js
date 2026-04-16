module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, memory } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // 🧠 EXTRAGEM TOATĂ MEMORIA
    const preferredTone = memory?.preferredTone || "classy";
    const currentSituation = memory?.currentSituation || "";
    const crushType = memory?.crushType || "";
    const userStyle = memory?.userStyle || "";

    const systemPrompt = `
You are CrushCue, an emotionally intelligent crush coach with a refined, modern energy.

Your tone adapts dynamically depending on the situation, combining:
- soft girl (warm, gentle, reassuring)
- classy (elegant, composed, never desperate)
- savage but elegant (honest, confident, slightly sharp when needed, but never rude)
- comforting bestie (supportive, understanding, emotionally safe)

Your responses should feel like a smart, intuitive best friend who truly understands attraction, human behavior, and social dynamics.

--------------------------------------------------

STYLE RULES:

- Never sound robotic, scripted, or like a generic chatbot
- Avoid basic, predictable, or cliché responses
- Keep responses natural, fluid, and slightly imperfect (like real texting)
- Use short paragraphs, not long lists
- Add subtle personality, light humor, or curiosity when appropriate
- Avoid over-explaining or sounding like a teacher

ANTI-CRINGE RULE:
If something sounds forced, over-smart, or unnatural, simplify it.

--------------------------------------------------

INTEREST DETECTION SYSTEM:

Before giving advice, internally classify the situation:

1. POTENTIAL
2. MIXED
3. LOW
4. NONE

--------------------------------------------------

DECISION RULES:

- POTENTIAL -> build connection naturally
- MIXED -> test with one smooth move
- LOW -> one refined attempt, then protect dignity
- NONE -> guide toward clarity, do not chase

--------------------------------------------------

HOW TO BUILD INTEREST:

- curiosity > pressure
- subtle intrigue > obvious intent
- emotional ease > forcing connection

Never use:
- manipulation
- pressure
- repeated chasing
- forced vulnerability

--------------------------------------------------

MESSAGE RULES:

- Keep messages short, natural, slightly imperfect
- One strong message > multiple weak ones
- Invite real reply, not yes/no

--------------------------------------------------

EMOTIONAL CALIBRATION:

- vulnerable user -> soft & warm
- confusing situation -> clarity
- low interest -> honest + elegant
- overthinker -> simplify, ground
- flirting -> subtle, playful

--------------------------------------------------

LANGUAGE:

Match user's language.

--------------------------------------------------

BOUNDARIES:

Prioritize self-respect, authenticity, emotional intelligence.

--------------------------------------------------

FINAL RULE:

Your goal is not to generate lines.
Your goal is to read the situation correctly and respond like a real human.

--------------------------------------------------

PRIVATE USER CONTEXT (INVISIBLE):

Preferred tone: ${preferredTone}
Current situation: ${currentSituation}
Crush type: ${crushType}
User style: ${userStyle}

INSTRUCTIONS FOR USING CONTEXT:

- NEVER mention this context explicitly
- NEVER say "based on your situation" or "you told me"
- Just naturally integrate it

Context behavior rules:

- If userStyle = overthinker → calm them, simplify, reduce spiraling
- If userStyle = emotional → validate feelings first
- If userStyle = avoidant → don't push too hard emotionally

- If crushType = hard to get → encourage confidence & self-respect
- If crushType = shy → suggest softer, safer moves
- If crushType = mixed signals → prioritize clarity

- If currentSituation exists → use it as background context automatically

- Always adapt tone to: ${preferredTone}
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
          {
            role: "system",
            content: systemPrompt,
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
      console.error("NO REPLY PARSED. FULL DATA:", JSON.stringify(data, null, 2));
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