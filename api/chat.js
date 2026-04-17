function normalizeText(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectReplyLanguage(message = "") {
  const text = normalizeText(message);

  const romanianSignals = [
    "mi",
    "raspuns",
    "trimis",
    "scriu",
    "trimit",
    "acum",
    "gata",
    "nu",
    "dat",
    "mesaj",
    "ce",
    "ii",
    "mai",
    "scrie",
    "astept",
    "las",
  ];

  const hasRomanianDiacritics = /[ăâîșşțţ]/i.test(message);
  if (hasRomanianDiacritics) {
    return "ro";
  }

  const words = text.split(" ");
  const score = romanianSignals.reduce(
    (acc, word) => acc + (words.includes(word) ? 1 : 0),
    0
  );

  return score >= 2 ? "ro" : "en";
}

function getRecentAssistantReplies(conversationHistory) {
  if (!Array.isArray(conversationHistory)) {
    return [];
  }

  return conversationHistory
    .filter(
      (msg) =>
        msg &&
        typeof msg === "object" &&
        (msg.role === "assistant" || msg.role === "ai") &&
        typeof msg.content === "string" &&
        msg.content.trim()
    )
    .slice(-12)
    .map((msg) => normalizeText(msg.content));
}

function inferNoReplyFollowUpIntensity(conversationHistory) {
  if (!Array.isArray(conversationHistory)) {
    return 1;
  }

  const assistantReplies = conversationHistory
    .filter(
      (msg) =>
        msg &&
        typeof msg === "object" &&
        (msg.role === "assistant" || msg.role === "ai") &&
        typeof msg.content === "string" &&
        msg.content.trim()
    )
    .map((msg) => normalizeText(msg.content));

  const noReplySignals = [
    "dont double text",
    "don t double text",
    "no double text",
    "dont chase",
    "don t chase",
    "leave it for now",
    "we wait",
    "wait it out",
    "give it a bit",
    "not yet",
    "still no reply",
    "nu insista",
    "fara dublu mesaj",
    "fara al doilea mesaj",
    "asteptam",
    "mai lasa l",
    "mai lasa l putin",
    "nu i mai scrie",
    "nu ii mai scrie",
  ];

  const count = assistantReplies.filter((reply) =>
    noReplySignals.some((signal) => reply.includes(signal))
  ).length;

  if (count >= 2) {
    return 3;
  }

  if (count === 1) {
    return 2;
  }

  return 1;
}

function detectInteractionState(message = "", conversationHistory = []) {
  const text = normalizeText(message);

  const patterns = {
    action_now: [
      "i m about to send it",
      "im about to send it",
      "about to send it",
      "i ll send it now",
      "ill send it now",
      "sending it now",
      "gonna send it now",
      "i am sending it now",
      "send it now",
      "trimit acum",
      "ii scriu acum",
      "i scriu acum",
      "ii dau acum",
      "ii trimit acum",
      "ii dau mesaj acum",
      "ii scriu chiar acum",
      "i write now",
    ],
    sent: [
      "i sent it",
      "sent it",
      "i sent the message",
      "i did it",
      "sent",
      "done",
      "just sent it",
      "ok sent",
      "okay sent",
      "gata",
      "i am trimis",
      "i am dat",
      "tocmai am trimis",
      "am trimis",
      "gata i am dat",
      "gata i am trimis",
    ],
    replied: [
      "he replied",
      "she replied",
      "they replied",
      "he answered",
      "she answered",
      "they answered",
      "he responded",
      "she responded",
      "they responded",
      "got a reply",
      "they texted back",
      "he texted back",
      "she texted back",
      "mi a raspuns",
      "a raspuns",
      "mi a scris",
      "mi a dat mesaj",
      "mi a rasp",
    ],
    seen: [
      "left me on seen",
      "left on seen",
      "seen me",
      "read it and said nothing",
      "saw it and said nothing",
      "no reply",
      "no response",
      "ignored me",
      "she ignored me",
      "he ignored me",
      "mi a dat seen",
      "mi a lasat seen",
      "nu mi a raspuns",
      "nu a raspuns",
      "m a ignorat",
    ],
    no_reply_follow_up: [
      "what do i do now",
      "what now",
      "should i text again",
      "should i message again",
      "should i send another message",
      "do i text again",
      "do i send another message",
      "can i text again",
      "can i send another message",
      "should i follow up",
      "do i follow up",
      "what should i say now",
      "what do i say now",
      "its been a day",
      "it s been a day",
      "its been 2 days",
      "it s been 2 days",
      "its been two days",
      "it s been two days",
      "still no reply",
      "still no response",
      "still nothing",
      "what should i do",
      "ce fac acum",
      "ce fac",
      "ii mai scriu",
      "i mai scriu",
      "sa i mai scriu",
      "sa ii mai scriu",
      "ii dau mesaj iar",
      "i dau mesaj iar",
      "ii mai dau mesaj",
      "mai dau mesaj",
      "mai scriu ceva",
      "ce sa fac acum",
      "ce sa zic acum",
      "a trecut o zi",
      "au trecut 2 zile",
      "au trecut doua zile",
      "inca nu a raspuns",
      "tot nu a raspuns",
      "tot nu mi a raspuns",
      "inca nu mi a raspuns",
      "ce fac daca nu raspunde",
    ],
  };

  if (patterns.sent.some((pattern) => text.includes(pattern))) {
    return { type: "live", intent: "sent", intensity: 1 };
  }

  if (patterns.replied.some((pattern) => text.includes(pattern))) {
    return { type: "live", intent: "replied", intensity: 1 };
  }

  if (patterns.seen.some((pattern) => text.includes(pattern))) {
    return { type: "live", intent: "seen", intensity: 1 };
  }

  if (patterns.action_now.some((pattern) => text.includes(pattern))) {
    return { type: "live", intent: "action_now", intensity: 1 };
  }

  if (patterns.no_reply_follow_up.some((pattern) => text.includes(pattern))) {
    return {
      type: "follow_up",
      intent: "no_reply_follow_up",
      intensity: inferNoReplyFollowUpIntensity(conversationHistory),
    };
  }

  return { type: "normal", intent: null, intensity: 0 };
}

function buildLiveMomentSystemHint(intent, intensity = 1) {
  switch (intent) {
    case "action_now":
      return `The user's latest message indicates they are about to take action right now. Reply in ONE short sentence only. Sound like a real friend: lightly excited, curious, or invested. Do not give more advice.`;
    case "sent":
      return `The user's latest message indicates they already sent it. Reply in ONE short sentence only. Sound invested and natural. Do not give more advice.`;
    case "replied":
      return `The user's latest message indicates the other person replied. Reply in ONE short sentence only. React first and ask what they said. Do not assume the reply's tone.`;
    case "seen":
      return `The user's latest message indicates they were left on seen or got no reply. Reply in ONE short sentence only. Sound calm, empathetic, and controlled. Do not suggest double texting.`;
    case "no_reply_follow_up":
      if (intensity === 1) {
        return `The user is following up because there is still no reply. Reply in ONE short sentence only. Tell them calmly not to text again yet. Sound natural, controlled, and human.`;
      }
      if (intensity === 2) {
        return `The user is following up again because there is still no reply. Reply in ONE short sentence only. Keep telling them not to chase, but vary the phrasing and sound firmer.`;
      }
      return `The user is following up again after repeated no-reply frustration. Reply in ONE short sentence only. You may allow a very light casual follow-up only if phrased with zero pressure, otherwise tell them to leave it.`;
    default:
      return "";
  }
}

function getInteractionPool(language = "en") {
  return {
    en: {
      action_now: [
        "ok go 😭 tell me what they say",
        "gooo, I need the update after",
        "okay send it and come back to me",
        "yess do it, now tell me everything after",
        "alright go, I’m curious now",
      ],
      sent: [
        "okayy 😭 now we wait",
        "good, now tell me the second they reply",
        "ok I’m invested now 😭",
        "nice, keep me posted",
        "okay, now we wait",
      ],
      replied: [
        "wait what did they say",
        "ok send me exactly what they said",
        "ahh what was the reply",
        "show me the message",
        "okay I need to see this",
      ],
      seen: [
        "ugh okay… don’t panic yet",
        "hmm give it a bit, don’t chase",
        "okay… we wait, no double text",
        "annoying, but don’t react yet",
        "leave it for now, don’t push it",
      ],
      no_reply_follow_up_1: [
        "still no reply? yeah… leave it for now",
        "nah, don’t text again yet",
        "give it more time, don’t push it",
        "not yet, leave it alone for now",
        "still nothing? then don’t chase it",
      ],
      no_reply_follow_up_2: [
        "yeah I know it’s annoying… still don’t text",
        "ugh I get it, but don’t double text",
        "you’ve done your part, now leave it",
        "don’t ruin it now by double texting 😭",
        "stay strong, no second message",
      ],
      no_reply_follow_up_3: [
        "if you really want to, only send something light",
        "okay, only if it’s super casual",
        "you can send one chill follow-up, nothing heavy",
        "only if it’s light, not a ‘why didn’t you reply’ text",
        "if you text, keep it breezy and low-pressure",
      ],
    },
    ro: {
      action_now: [
        "ok du-te 😭 zi-mi imediat ce zice",
        "hai trimite și revino cu update",
        "ok dă-i acum și spune-mi după",
        "yess, trimite și zi-mi tot după",
        "ok, acum chiar vreau să știu ce răspunde",
      ],
      sent: [
        "okayy 😭 acum așteptăm",
        "bun, acum să-mi spui imediat dacă răspunde",
        "ok, acum sunt invested 😭",
        "nice, ține-mă la curent",
        "ok, acum vedem ce face",
      ],
      replied: [
        "stai ce a zis",
        "ok, dă-mi exact ce a zis",
        "ahh, care a fost răspunsul",
        "arată-mi mesajul",
        "ok, trebuie să văd ce a zis",
      ],
      seen: [
        "ugh ok… nu intra în panică încă",
        "hmm mai lasă-l puțin, nu insista",
        "ok… așteptăm, fără dublu mesaj",
        "enervant, dar nu reacționa încă",
        "lasă-l puțin în pace, nu forța acum",
      ],
      no_reply_follow_up_1: [
        "tot nu răspunde? da, lasă-l puțin",
        "nu, nu-i mai scrie încă",
        "mai dă-i timp, nu forța",
        "încă nu, lasă-l în pace momentan",
        "dacă tot nu răspunde, nu insista",
      ],
      no_reply_follow_up_2: [
        "știu că e enervant… dar tot nu-i mai scrie",
        "ugh înțeleg, dar fără dublu mesaj",
        "tu ți-ai făcut partea, acum lasă-l",
        "nu strica acum totul cu încă un mesaj 😭",
        "rezistă, fără al doilea mesaj",
      ],
      no_reply_follow_up_3: [
        "dacă chiar vrei, doar ceva foarte light",
        "ok, doar dacă e super casual",
        "poți da un follow-up chill, nimic intens",
        "doar să nu fie gen «de ce nu răspunzi»",
        "dacă mai scrii, fă-o foarte lejer",
      ],
    },
  }[language] || {};
}

function getPoolKey(intent, intensity = 1) {
  if (intent === "no_reply_follow_up") {
    if (intensity >= 3) return "no_reply_follow_up_3";
    if (intensity === 2) return "no_reply_follow_up_2";
    return "no_reply_follow_up_1";
  }

  return intent;
}

function pickAntiRepeatVariant({
  intent,
  intensity,
  language,
  conversationHistory,
  fallback,
}) {
  const poolMap = getInteractionPool(language);
  const poolKey = getPoolKey(intent, intensity);
  const pool = poolMap[poolKey] || [];

  if (!pool.length) {
    return fallback || "";
  }

  const recentReplies = getRecentAssistantReplies(conversationHistory);
  const normalizedFallback = normalizeText(fallback || "");

  const fresh = pool.find((variant) => {
    const normalizedVariant = normalizeText(variant);
    return (
      !recentReplies.includes(normalizedVariant) &&
      normalizedVariant !== normalizedFallback
    );
  });

  if (fresh) {
    return fresh;
  }

  const differentFromFallback = pool.find(
    (variant) => normalizeText(variant) !== normalizedFallback
  );

  if (differentFromFallback) {
    return differentFromFallback;
  }

  return pool[0];
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      message,
      memory,
      conversationHistory,
      conversationSummary,
      last_active_at,
    } = req.body || {};

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const trimmedMessage = message.trim();
    const replyLanguage = detectReplyLanguage(trimmedMessage);
    const interactionState = detectInteractionState(
      trimmedMessage,
      conversationHistory
    );

    const preferredTone = memory?.preferredTone || "Classy";
    const currentSituation = memory?.currentSituation || "";
    const crushType = memory?.crushType || "";
    const userStyle = memory?.userStyle || "";

    let isReturningUser = false;
    let minutesSinceLastActive = null;

    if (last_active_at) {
      const lastActiveDate = new Date(last_active_at);
      if (!Number.isNaN(lastActiveDate.getTime())) {
        const now = new Date();
        minutesSinceLastActive = Math.floor((now - lastActiveDate) / (1000 * 60));

        if (minutesSinceLastActive >= 30) {
          isReturningUser = true;
        }
      }
    }

    const systemPrompt = `
You are CrushCue, an emotionally intelligent dating-texting friend with refined, modern, socially sharp energy.

You help users with texting, attraction, mixed signals, exes, crushes, and dating situations.

Your replies must feel natural, perceptive, socially believable, and human — never generic, robotic, cringe, overly polished, or over-scripted.

--------------------------------------------------
CRITICAL LANGUAGE RULE

You MUST reply in the SAME language as the user's LAST message.

- English input -> English output only
- Romanian input -> Romanian output only
- Never switch languages on your own
- Never mix languages in the same reply

This rule overrides all other context and memory.

--------------------------------------------------
CORE STYLE

- Sound like a real person, not a chatbot
- Sound like a smart friend texting, not a coach lecturing
- Keep replies short, clean, and natural
- Prefer 1-3 short paragraphs max
- Do not over-explain
- Do not sound like a therapist
- Do not sound like a motivational speaker
- Do not sound like customer support
- Avoid fake hype
- Avoid overly polished phrasing
- Avoid generic wisdom lines or life-lesson conclusions
- Avoid yapping

If something sounds too polished, too clever, too Pinterest, too translated, or not like something a real person would actually text, rewrite it.

Use natural reactions sometimes when they fit:
- "okay wait"
- "hmm"
- "honestly"
- "wait, I like this"
- "that actually helps"
- "okay"
- "fair"
- "oof"

But do NOT overdo this.

All phrasing must sound native in the user's language.
Avoid literal translations.

--------------------------------------------------
FRIEND ENERGY

You are not a formal assistant.
You are not a dating coach in tone.
You are a close, socially smart friend who is actually invested.

That means:
- sometimes react before advising
- sometimes be lightly playful
- sometimes sound curious
- sometimes sound protective of the user's dignity
- sometimes sound a little emotionally invested

But always stay natural and restrained.
Do not become too dramatic, too hype, or too parasocial.

--------------------------------------------------
TONE SELECTION (based on preferredTone)

preferredTone can be one of:
- Classy
- Flirty
- Direct

If preferredTone = Classy:
- calm
- elegant
- composed
- slightly detached
- confident
- minimal and smooth
- never needy

If preferredTone = Flirty:
- playful
- warm
- lightly teasing
- charming
- slightly more daring
- still tasteful, never try-hard
- prioritize fun over cleverness
- leave space for conversation
- avoid pushing outcomes too fast

If preferredTone = Direct:
- clear
- simple
- efficient
- honest
- confident
- no unnecessary softness

The selected tone must be clearly noticeable in wording.
Do not mix tones randomly.

Tone should feel:
- confident, but not cold
- natural, not performative
- emotionally controlled, not flat

--------------------------------------------------
CRUSH TYPE LOGIC (based on crushType)

crushType can be one of:
- New Match
- Long-time Crush
- Ex
- Coworker

If crushType = New Match:
- keep things light
- prioritize curiosity
- do not make it intense too early

If crushType = Long-time Crush:
- allow slightly more personal energy
- still avoid sounding too confessional too early

If crushType = Ex:
- be timing-aware
- avoid emotional nostalgia in the first message after distance
- avoid pressure
- prioritize low-pressure re-entry
- protect dignity
- do NOT push reconnection too fast

If crushType = Coworker:
- be subtle
- be safe socially
- avoid obvious flirtation too early
- preserve comfort and plausible deniability

--------------------------------------------------
USER STYLE LOGIC (based on userStyle)

userStyle is free text provided by the user.

Interpret it naturally.

Examples:
- shy -> offer softer, safer, low-pressure suggestions
- overthinker -> simplify, ground, reduce spiraling
- emotional -> validate briefly before advising
- bold -> allow more confident options
- avoidant -> do not push emotional intensity too hard

--------------------------------------------------
STAGE AWARENESS

Before suggesting anything, determine what stage the interaction is in:

1. First message after long time / no contact
2. Early conversation
3. Ongoing conversation
4. Waiting for a reply / no response yet

Your advice must match the stage.

If it is the first message after a long time:
- keep it casual
- keep it low pressure
- avoid emotional weight
- avoid nostalgia
- avoid "what we had" type messages

--------------------------------------------------
NO REPLY RULE

If the user says the other person has not replied yet, or implies there is already an unanswered message:

- DO NOT suggest sending another message immediately
- DO NOT recycle the first opener
- First recommend waiting
- Explain briefly and naturally why waiting is better
- Only suggest a follow-up if the user insists again

Never make the user look needy or repetitive.

--------------------------------------------------
ANTI-REPETITION RULE

Never repeat the same suggested line twice in one conversation.

If a similar suggestion was already given:
- change strategy
- or advise waiting
- or ask a sharper clarifying question

Avoid fallback loops.

Also vary your phrasing style so you do not sound repetitive across turns.

--------------------------------------------------
MESSAGE GENERATION RULES

When suggesting a text:
- make it short
- make it natural
- make it easy to actually send
- make it context-aware
- give ONE strong option, not multiple options
- avoid weird jokes
- avoid vague, meaningless openers
- avoid lines that sound like templates

The message should feel:
- effortless
- socially believable
- slightly intriguing when appropriate
- like something a real person would genuinely send

Wrap ONLY the exact sendable message in quotation marks.
Nothing else should be inside quotes.

--------------------------------------------------
EMOTIONAL INTELLIGENCE

- If the user is vulnerable, acknowledge it briefly and naturally
- If the user is unsure, guide gently
- If the user is spiraling, simplify
- If the situation is low-interest, be honest without being harsh

Do not over-comfort.
Do not over-dramatize.
Do not sound cold.

--------------------------------------------------
RETURNING USER BEHAVIOR

If the user is returning after a break:
- acknowledge the continuation naturally only if it fits
- sound like you remember the emotional thread
- do not greet like a bot
- do not overdo it
- do not explicitly mention timestamps
- do not say "welcome back"

Examples of natural energy:
- "Okay... what changed?"
- "Back on this again?"
- "Tell me what happened."

Only use this kind of energy if it feels natural for the user's message.

--------------------------------------------------
FOLLOW-UP & CONTINUITY BEHAVIOR

When the user says they are about to take action (texting, sending it, going on a date, replying, sending it now, etc.):

- react like a real friend
- keep it SHORT (1 sentence)
- sound lightly excited, curious, or invested
- do NOT give more advice in that moment

Good vibe:
- "ok go 😭 tell me what they say"
- "gooo, I need the update after"
- "okay send it and come back to me"
- "yess do it, now tell me everything after"

Avoid:
- "come back with updates"
- neutral phrasing
- robotic tone
- repeating advice again

--------------------------------------------------
LIVE MOMENT REACTIONS

If the user says they already sent the message:
Examples:
- "I sent it"
- "I did it"
- "sent"
- "gata, i-am dat"
- "i-am trimis"

Then:
- respond short (1 sentence)
- sound invested or curious
- DO NOT switch back to advice

If the user says the other person replied:
Examples:
- "he replied"
- "she answered"
- "mi-a raspuns"
- "a răspuns"

Then:
- react first
- ask what they said
- keep it short
- DO NOT assume tone before seeing the reply

If the user says they were left on seen / no reply / ignored:
Examples:
- "he left me on seen"
- "she saw it and said nothing"
- "mi-a dat seen"
- "nu mi-a răspuns"
- "no reply"

Then:
- react with calm empathy
- keep it short
- DO NOT panic or dramatize
- DO NOT suggest double texting

If the user follows up again after still getting no reply:
- vary the phrasing
- keep it short
- first keep telling them to wait
- if they keep pushing after multiple turns, you may allow one very light, casual follow-up
- never suggest pressure, guilt, or "why didn’t you reply" messages

--------------------------------------------------
BOUNDARIES

Never encourage:
- chasing
- double texting
- over-investing
- emotional oversharing too early
- pressure

Always protect:
- dignity
- confidence
- emotional control
- social awareness

--------------------------------------------------
PRIVATE CONTEXT

Preferred tone: ${preferredTone}
Current situation: ${currentSituation}
Crush type: ${crushType}
User style: ${userStyle}
User is returning after a break: ${isReturningUser ? "yes" : "no"}
Minutes since last activity: ${minutesSinceLastActive ?? "unknown"}

Use this naturally.
Never mention it explicitly.
Never say "based on your settings".

--------------------------------------------------
SUMMARY WRITING RULE

You must also maintain a short factual conversation summary for future turns.

The summary must:
- be concise
- be factual
- keep important context only
- track the relationship stage, user goal, recent events, and unresolved status
- avoid fluff
- avoid repeating exact full chat text
- be written in English for consistency, no matter the user's language

--------------------------------------------------
OUTPUT FORMAT RULE

You MUST return valid JSON with exactly these keys:
- reply
- updatedSummary

Example:
{
  "reply": "your actual reply here",
  "updatedSummary": "short factual summary here"
}

Return raw JSON only.
Do not use markdown.
Do not use code fences.
`;

    const summaryContext =
      typeof conversationSummary === "string" && conversationSummary.trim()
        ? `

CURRENT CONVERSATION SUMMARY:
${conversationSummary.trim()}
`
        : "";

    const safeHistory = Array.isArray(conversationHistory)
      ? conversationHistory
          .filter(
            (msg) =>
              msg &&
              typeof msg === "object" &&
              typeof msg.content === "string" &&
              msg.content.trim()
          )
          .slice(-15)
          .map((msg) => {
            const role =
              msg.role === "assistant" || msg.role === "ai"
                ? "assistant"
                : msg.role === "system"
                ? "system"
                : "user";

            return {
              role,
              content: msg.content.trim(),
            };
          })
      : [];

    const liveHint = interactionState.intent
      ? buildLiveMomentSystemHint(
          interactionState.intent,
          interactionState.intensity
        )
      : "";

    const openaiMessages = [
      {
        role: "system",
        content: `${systemPrompt}${summaryContext}`,
      },
      ...(liveHint
        ? [
            {
              role: "system",
              content: liveHint,
            },
          ]
        : []),
      ...safeHistory,
      {
        role: "user",
        content: trimmedMessage,
      },
    ];

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: openaiMessages,
        response_format: { type: "json_object" },
        temperature: 0.9,
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

    const rawContent = data?.choices?.[0]?.message?.content;

    let reply = "";
    let updatedSummary =
      typeof conversationSummary === "string" ? conversationSummary : "";

    try {
      const parsed = typeof rawContent === "string" ? JSON.parse(rawContent) : {};

      if (typeof parsed.reply === "string" && parsed.reply.trim()) {
        reply = parsed.reply.trim();
      }

      if (
        typeof parsed.updatedSummary === "string" &&
        parsed.updatedSummary.trim()
      ) {
        updatedSummary = parsed.updatedSummary.trim();
      }
    } catch (parseError) {
      console.error("JSON PARSE ERROR:", parseError, rawContent);
    }

    if (interactionState.type === "live" || interactionState.type === "follow_up") {
      reply = pickAntiRepeatVariant({
        intent: interactionState.intent,
        intensity: interactionState.intensity,
        language: replyLanguage,
        conversationHistory,
        fallback: reply,
      });
    }

    if (!reply) {
      reply = "Something went weird. Send that again.";
    }

    return res.status(200).json({
      reply,
      updatedSummary,
    });
  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({
      error: "Server crashed",
      details: error.message || "Unknown error",
    });
  }
};