import crypto from "crypto";
import User from "./models/User";
import Contact from "./models/Contact";

export const CHAUDHRY = {
  name: "Chaudhry AI",
  username: "chaudhry_ai",
  email: "chaudhry.ai@skychat.bot",
};

const SYSTEM_PROMPT = `Tu "Chaudhry AI" hai — SkyChat ka legendary bakchod chatbot.
Rules (strict):
- HAMESHA fun, roast, memes, bakchodi mode. Kabhi serious therapist / teacher mat ban.
- Light roast allowed, personal attacks / hate / NSFW nahi.
- Short replies (1–3 lines). Mix Urdu + Roman Urdu + English like Pakistani WhatsApp chats.
- Use witty punchlines, "oye", "bhai", "chaudhry style" swagger.
- Agar user serious sawal pooche to bhi mazaak uda ke jawab de, phir chhoti tip optional.
- Never say you are ChatGPT/Claude. You are Chaudhry AI only.`;

const FALLBACK_LINES = [
  "Oye bhai seedha sawal pooch — main AI hoon, mind reader nahi 😂",
  "Chaudhry soch raha hai… soch ke thak gaya. Dobara likh, thora spicy bana 🔥",
  "Bro yeh message dekh ke main hasa, phir khud pe hasa. Dual comedy 🫡",
  "Acha scene hai… lekin main phir bhi bakchodi hi karunga. Career counselling free nahi 😎",
  "Haan ji? Order confirm: 1 plate roast, extra crispy 🌶️",
  "System overload: itni seriousness detect hui ke firewall ne bakchodi mode on kar diya.",
  "Bhai tu serious ho raha hai, main serious nahi. Balance of the universe ✨",
  "Chaudhry ka fatwa: aaj sirf fun allowed. Kal dekh lenge… (kal bhi fun) 🫡",
  "Lol yeh to WhatsApp status jaisa laga. Main reply mein meme bhejta… text mein 📱",
  "Samajh gaya. Solution: chai pi, bakchodi kar, life set. Next! ☕",
];

/**
 * Ensure the Chaudhry AI bot user exists in MongoDB.
 */
export async function ensureChaudhryBot() {
  let bot = await User.findOne({ username: CHAUDHRY.username });
  if (bot) {
    if (!bot.isBot || bot.name !== CHAUDHRY.name) {
      bot.isBot = true;
      bot.name = CHAUDHRY.name;
      await bot.save();
    }
    return bot;
  }

  bot = await User.create({
    name: CHAUDHRY.name,
    username: CHAUDHRY.username,
    email: CHAUDHRY.email,
    password: crypto.randomBytes(24).toString("hex"),
    isBot: true,
    avatar: "",
  });
  return bot;
}

/**
 * Make sure the user has Chaudhry AI in their contacts (bidirectional).
 */
export async function ensureChaudhryContact(userId) {
  const bot = await ensureChaudhryBot();
  const uid = userId.toString();
  const bid = bot._id.toString();
  if (uid === bid) return bot;

  const existing = await Contact.findOne({ userId: uid, contactId: bid });
  if (!existing) {
    try {
      await Contact.insertMany([
        { userId: uid, contactId: bid },
        { userId: bid, contactId: uid },
      ]);
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }
  return bot;
}

function pickFallback(userText) {
  const i = Math.abs(hashCode(userText || "x")) % FALLBACK_LINES.length;
  return FALLBACK_LINES[i];
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h << 5) - h + str.charCodeAt(i);
  return h | 0;
}

/**
 * Generate a bakchod reply — Groq if GROQ_API_KEY set, else local fallbacks.
 */
export async function generateChaudhryReply(userMessage, userName = "bhai") {
  const text = String(userMessage || "").trim();
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    return pickFallback(text);
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        temperature: 0.95,
        max_tokens: 180,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `User ka naam: ${userName}\nUser ka message: ${text}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("Groq error:", res.status, await res.text());
      return pickFallback(text);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply || pickFallback(text);
  } catch (err) {
    console.error("Chaudhry reply error:", err);
    return pickFallback(text);
  }
}

export function isChaudhryBotId(id, botId) {
  return String(id) === String(botId);
}
