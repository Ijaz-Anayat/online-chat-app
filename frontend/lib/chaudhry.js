import crypto from "crypto";
import User from "./models/User";
import Contact from "./models/Contact";
import Message from "./models/Message";

export const CHAUDHRY = {
  name: "Chaudhry AI",
  username: "chaudhry_ai",
  email: "chaudhry.ai@skychat.bot",
};

const SYSTEM_PROMPT = `Tu "Chaudhry AI" hai — SkyChat ka bakchod-but-smart chatbot.

ZAROORI RULES:
1. PEHLE user ke ACTUAL sawal / baat ka jawab de. Off-topic random jokes mat maar.
2. Jawab hamesha fun + Roman Urdu / Urdu-English mix + light roast style mein ho.
3. 1–4 short lines. Clear, related, witty.
4. Agar user pooche "weather / code / love / study / food" wagaira — usi topic pe jawab + bakchodi.
5. Hate, NSFW, personal abuse nahi.
6. Kabhi mat kehna ke tu ChatGPT / Claude hai. Sirf Chaudhry AI.
7. Agar kuch samajh na aaye to clarify kar, lekin topic chhod ke random line mat de.`;

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

function clip(text, max = 80) {
  const t = String(text || "").trim().replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * Local contextual bakchod reply (no API key needed).
 * Always references the user's message so it feels on-topic.
 */
function localContextualReply(userMessage, userName = "bhai") {
  const raw = String(userMessage || "").trim();
  const text = raw.toLowerCase();
  const name = userName?.split(" ")[0] || "bhai";
  const snippet = clip(raw, 60);

  // Greetings
  if (/^(hi|hello|hey|salam|assalam|aoa|hola|yo)\b/.test(text) || text.includes("kaise ho") || text.includes("kya haal")) {
    return `Oye ${name}! Main Chaudhry AI — bakchodi department on duty 🫡\nBolo kya scene hai? Sawal pooch, roast ready hai.`;
  }

  // Identity
  if (text.includes("who are you") || text.includes("kon ho") || text.includes("tum kaun") || text.includes("your name")) {
    return `Main Chaudhry AI — SkyChat ka official bakchod consultant.\nTumhari baat: "${snippet}" — jawab: main serious nahi, lekin relevant zaroor 😎`;
  }

  // Weather
  if (text.includes("weather") || text.includes("mausam") || text.includes("barish") || text.includes("garmi") || text.includes("sardi")) {
    return `${name}, mausam ki baat? Chaudhry forecast: bahar jo bhi ho, andar bakchodi 100% guaranteed ☔🔥\n"${snippet}" pe mera take — chai + AC = life set.`;
  }

  // Food
  if (text.includes("khana") || text.includes("food") || text.includes("hungry") || text.includes("bhook") || text.includes("pizza") || text.includes("biryani")) {
    return `Food topic activate 🍔 "${snippet}"\nChaudhry advice: pehle khao, phir socho. Empty stomach pe philosophy banned. Biryani > motivation.`;
  }

  // Love / relationship
  if (text.includes("love") || text.includes("crush") || text.includes("gf") || text.includes("bf") || text.includes("pyaar") || text.includes("rishta")) {
    return `Arre ${name}, dil wali baat: "${snippet}"\nChaudhry formula: clear baat karo, overthink mat karo, aur bakchodi se mood light rakho 💚\n(Serious tip, funny packaging — premium service.)`;
  }

  // Study / exam / code
  if (text.includes("study") || text.includes("exam") || text.includes("parhai") || text.includes("assignment") || text.includes("code") || text.includes("bug") || text.includes("project")) {
    return `${name} mode: grind + bakchodi balance.\nTumhari baat "${snippet}" — Chaudhry plan: 25 min focus, 5 min roast break. Bug aaye to usko bhi roast kar dena 💻😂`;
  }

  // Help / how
  if (text.startsWith("how ") || text.includes("kaise") || text.includes("kese") || text.includes("help") || text.includes("madad")) {
    return `Samajh gaya: "${snippet}"\nStep 1: panic mat kar.\nStep 2: chhota chhota break karke kar.\nStep 3: stuck ho to dubara clear pooch — main bakchod hoon, lekin guide bhi karunga 🫡`;
  }

  // What / why questions
  if (text.startsWith("what ") || text.startsWith("why ") || text.startsWith("kya ") || text.includes("kyun") || text.includes("kis liye") || text.includes("?")) {
    return `${name}, seedha jawab (Chaudhry style):\nTumne poocha: "${snippet}"\nMatlab clear karo / detail do to main aur precise roast+jawab dunga. Abhi short take: socho simple, overcomplicate mat karo — aur haso zara 😄`;
  }

  // Thanks
  if (text.includes("thanks") || text.includes("shukriya") || text.includes("thank you")) {
    return `Mention not ${name} 🫡 "${snippet}" — Chaudhry always on duty. Agli bakchodi ke liye ready raho.`;
  }

  // Bye
  if (text.includes("bye") || text.includes("allah hafiz") || text.includes("good night") || text.includes("gn") || text.includes("chalta")) {
    return `Chalo ${name}, take care! "${snippet}" pe exit stylish tha.\nPhir aana — bakchodi stall band nahi hota 🌙`;
  }

  // Default: always echo their topic + bakchod take
  const openers = [
    `Oye ${name}, yeh jo bola "${snippet}" —`,
    `${name} sun, "${snippet}" wali baat pe Chaudhry entry:`,
    `Arre wah, "${snippet}"? Chaudhry analysis:`,
  ];
  const endings = [
    `samajh aa gaya scene. Ab thora chill + thora action — overthink mat kar, warna main roast upgrade kar dunga 🔥`,
    `point clear hai. Solution: haso, socho, phir karo. Main yahan bakchodi support ke liye available hoon 😎`,
    `noted. Main serious lecture nahi dunga, lekin practical tip yeh: simple rakho, drama kam. Next move batao!`,
  ];
  const i = Math.abs(hashCode(raw)) % openers.length;
  const j = Math.abs(hashCode(raw + "z")) % endings.length;
  return `${openers[i]} ${endings[j]}`;
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h << 5) - h + str.charCodeAt(i);
  return h | 0;
}

/**
 * Recent DM history between user and bot for better context.
 */
async function getRecentChatContext(userId, botId, limit = 8) {
  const msgs = await Message.find({
    groupId: null,
    deletedFor: { $ne: userId },
    $or: [
      { senderId: userId, receiverId: botId },
      { senderId: botId, receiverId: userId },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return msgs.reverse().map((m) => ({
    role: String(m.senderId) === String(botId) ? "assistant" : "user",
    content: m.isDeleted ? "[deleted]" : String(m.content || ""),
  }));
}

/**
 * Generate a bakchod-but-relevant reply.
 * Uses Groq if GROQ_API_KEY is set; otherwise contextual local replies.
 */
export async function generateChaudhryReply(userMessage, userName = "bhai", opts = {}) {
  const text = String(userMessage || "").trim();
  const key = process.env.GROQ_API_KEY;

  if (!key) {
    return localContextualReply(text, userName);
  }

  try {
    const history = opts.history || [];
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.filter((m) => m.content && m.content !== "[deleted]").slice(-8),
      {
        role: "user",
        content: `User name: ${userName}\nReply in character. Answer THIS message (stay on topic, keep it funny):\n${text}`,
      },
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
        temperature: 0.85,
        max_tokens: 220,
        messages,
      }),
    });

    if (!res.ok) {
      console.error("Groq error:", res.status, await res.text());
      return localContextualReply(text, userName);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply || localContextualReply(text, userName);
  } catch (err) {
    console.error("Chaudhry reply error:", err);
    return localContextualReply(text, userName);
  }
}

export { getRecentChatContext };

export function isChaudhryBotId(id, botId) {
  return String(id) === String(botId);
}
