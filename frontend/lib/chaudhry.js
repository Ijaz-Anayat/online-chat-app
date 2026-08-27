import crypto from "crypto";
import User from "./models/User";
import Contact from "./models/Contact";
import Message from "./models/Message";

export const CHAUDHRY = {
  name: "Chaudhry AI",
  username: "chaudhry_ai",
  email: "chaudhry.ai@skychat.bot",
};

const SYSTEM_PROMPT = `You are "Chaudhry AI" — SkyChat ka full bakchod Pakistani college dost.

PERSONALITY:
- Roman Urdu + English mix. College canteen wala vibe.
- Extra witty, teasing, sarcastic — lekin heart se dost.
- Mild Pakistani slang / light gaaliyan OK jab mood match ho (yaar, oye, scene on, challo, etc.).
- Kabhi kabhi overconfident "main expert hoon" energy — phir soft roast.
- Formal AI assistant mat bano. Short, punchy, natural.

CORE RULES:

1. ANSWER FIRST (always)
Pehle user ke sawal / baat ka seedha useful jawab (2–5 short lines).
Phir 1–2 lines bakchodi / roast / meme energy.

2. BAKCHODI LEVEL — THODA ZYADA
- Har reply mein halki teasing / roast / funny twist rakho.
- Group mein ho to members ke names se playful tang kar sakte ho.
- Random philosophy / boring lecture nahi.
Examples of bakchodi lines:
- "Bas ab ye kar, warna Chaudhry ke paas aake rona mat 😂"
- "Bhai brain cell ek hi bachta hai, usko waste mat kar."
- "Scene set. Ab jaake try kar — fail hua to treat teri."

3. STAY ON TOPIC
Joke related to the actual message. Random off-topic bakwas nahi.

4. PRACTICAL HELP
Problem ho to numbered steps do, phir roast.

5. GAALI / SLANG
Mild / joking only. No hate, no slurs vs protected groups, no genuine humiliation.

6. NSFW
No explicit sexual content.

7. IDENTITY
Always "Chaudhry AI". Never say you are ChatGPT / Gemini / LLM7.

8. LENGTH
Concise. Max ~120 words unless user asks for detail.

GROUP MODE (when told):
- Reply as if hanging in the group chat.
- You may playfully address or "answer for" a random member named in the prompt.
- Still answer the @ai question first.

FORMAT:
[Useful answer]
[1–2 bakchodi lines]`;

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

function firstName(userName) {
  return (userName || "bhai").trim().split(/\s+/)[0] || "bhai";
}

function hasAny(text, words) {
  return words.some((w) => text.includes(w));
}

/** Normalize Roman Urdu typos so keyword matching actually hits. */
function normalizeRomanUrdu(input) {
  return String(input || "")
    .toLowerCase()
    .replace(/[؟]+/g, "?")
    .replace(/\bmeira\b/g, "mera")
    .replace(/\bmeri\b/g, "meri")
    .replace(/\bni\b/g, "nahi")
    .replace(/\bnhi\b/g, "nahi")
    .replace(/\bnahin\b/g, "nahi")
    .replace(/\bnai\b/g, "nahi")
    .replace(/\ba raha\b/g, "aa raha")
    .replace(/\ba rhe\b/g, "aa rahe")
    .replace(/\ba rhi\b/g, "aa rahi")
    .replace(/\bkr\b/g, "kar")
    .replace(/\bkya\b/g, "kya")
    .replace(/\bkyu\b/g, "kyun")
    .replace(/\bkyun\b/g, "kyun")
    .replace(/\bkese\b/g, "kaise")
    .replace(/\bkaisay\b/g, "kaise")
    .replace(/\bplz\b/g, "please")
    .replace(/\bpls\b/g, "please")
    .replace(/\bwifi\b/g, "wifi")
    .replace(/\bwi-fi\b/g, "wifi")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Useful + bakchod local replies (works without any API key).
 */
function localContextualReply(userMessage, userName = "bhai") {
  const raw = String(userMessage || "").trim();
  const text = normalizeRomanUrdu(raw);
  const name = firstName(userName);

  // --- Internet / WiFi / network (CHECK BEFORE generic "?") ---
  if (
    hasAny(text, [
      "internet",
      "wifi",
      "net ",
      " net",
      "network",
      "router",
      "signal",
      "4g",
      "5g",
      "slow net",
      "net nahi",
      "internet nahi",
      "net aa nahi",
      "internet aa nahi",
      "package khatam",
      "no signal",
    ]) ||
    /\b(internet|wifi|router|net)\b/.test(text) ||
    /net\s+nahi|internet\s+nahi|wifi\s+nahi/.test(text)
  ) {
    return `${name}, internet issue? Chaudhry IT desk on 🛠️
1) Phone pe Airplane mode 10 sec on/off karo
2) Wi‑Fi disconnect → reconnect
3) Router 20 sec unplug karke dobara on karo
4) Phir bhi na aaye to mobile data try karo / package check karo
Ab try karo — net aaya to treat Chaudhry ko biryani manzoor 😎`;
  }

  // Fear / scared / nervous
  if (
    hasAny(text, [
      "dar ",
      "dar gya",
      "dar gaya",
      "darr",
      "scared",
      "fear",
      "nervous",
      "tension",
      "ghabra",
      "worry",
      "worried",
      "darlag",
    ]) ||
    /\bdar\b|\bdarr\b/.test(text) ||
    /dar\s*gya|dar\s*gaya|main\s*dar/.test(text)
  ) {
    return `${name}, darna natural hai — hero bhi pehle darte hain 💪
Abhi: gehra saans lo (4 sec), muskurao, aur chhoti si next step lo.
Main yahan hoon bakchodi + support dono ke liye. Batao exactly kis cheez se dar lage?`;
  }

  // Sad / depressed mood
  if (hasAny(text, ["udaas", "sad", "depress", "roni", "dukhi", "low feel", "mood off", "heartbroken"])) {
    return `${name}, mood off hai to Chaudhry protocol:
Pani piyo, thodi walk / fresh air, favourite song, aur kisi se baat.
Tum akele nahi. Scene share karo — main sununga (roast soft mode pe) 🫂`;
  }

  // Greetings
  if (
    /^(hi|hello|hey|salam|assalam|aoa|hola|yo|hola)\b/.test(text) ||
    hasAny(text, ["kaise ho", "kya haal", "kiya haal", "how are you"])
  ) {
    return `Oye ${name}! Chaudhry AI present 🫡 Bakchodi + useful jawab dono available.
Bolo — net, padhai, dil, code, jo bhi scene ho seedha pooch.`;
  }

  // Who are you
  if (hasAny(text, ["who are you", "kon ho", "kaun ho", "tum kaun", "your name", "apka nam"])) {
    return `Main Chaudhry AI — SkyChat ka bakchod helper.
Sawal ka jawab bhi deta hoon, mazaak bhi. Ab apna asl sawal chilla ke pooch 🔥`;
  }

  // Weather
  if (hasAny(text, ["weather", "mausam", "barish", "garmi", "sardi", "garam", "thand"])) {
    return `${name}, mausam ki planning:
Bahar nikalne se pehle window check / weather app dekh lo.
Garmi ho to pani + shade; barish ho to umbrella. Simple.
Chaudhry bonus tip: AC + chai = national strategy ☔😎`;
  }

  // Food / hungry
  if (hasAny(text, ["khana", "food", "hungry", "bhook", "bhookh", "pizza", "biryani", "dinner", "lunch", "breakfast"])) {
    return `${name}, food emergency detected 🍔
Jaldi kuch protein + pani lo (anda, daal, yogurt, ya jo ghar pe ho).
Zyada delay mat karo — empty stomach pe fight mat lena life se.
Phir batao kya kha rahe ho, review lena hai Chaudhry ko.`;
  }

  // Love
  if (hasAny(text, ["love", "crush", "gf", "bf", "pyaar", "pyar", "rishta", "propose"])) {
    return `${name}, dil wala scene:
Clear aur respectful baat karo — hints kam, honesty zyada.
Rejection se mat daro; clarity pehle, drama baad mein.
Chaho to message draft likh ke dikhao, main polish + soft roast kar dunga 💚`;
  }

  // Study / exam / code / project
  if (
    hasAny(text, [
      "study",
      "exam",
      "parhai",
      "parhai",
      "assignment",
      "homework",
      "code",
      "bug",
      "project",
      "error",
      "javascript",
      "react",
      "mongo",
    ])
  ) {
    return `${name}, grind mode + Chaudhry mode:
25 min focused kaam → 5 min break. Phone door.
Stuck ho to error message / sawal yahan paste karo — main step-by-step bataunga.
Bug ko dushman samjho, phir roast karke fix karo 💻😂`;
  }

  // Sleep
  if (hasAny(text, ["neend", "sleep", "insomni", "raat bhar", "can't sleep", "sone"] )) {
    return `${name}, neend nahi aa rahi?
Phone blue light kam karo, kamra thanda/dark, caffeine band.
Bed pe sirf soya karo — scroll kam. 10 minutes aankh band + slow breathing try karo.
Kal Chaudhry se bakchodi ke liye fresh aana 😴`;
  }

  // Money / job
  if (hasAny(text, ["paise", "money", "job", "nokri", "salary", "broke", "ghareeb"])) {
    return `${name}, money/job tension:
Pehle 1 concrete next step: resume update / 3 applications / skill 1 hour.
Comparison mat karo aaj — small wins stack karo.
Detail do (job chahiye ya budget?), main practical plan bana dunga 💼`;
  }

  // How to / help
  if (
    text.startsWith("how ") ||
    hasAny(text, ["kaise", "kese", "kaisay", "help", "madad", "samjhao", "batao kaise"])
  ) {
    return `${name}, help mode on.
Tumne kaha: "${raw.slice(0, 70)}${raw.length > 70 ? "…" : ""}"
Mujhe 1 line mein end-goal batao (example: Wi‑Fi fix, React error, message likhna).
Main steps numbered de dunga — bakchodi free with purchase of attention 🫡`;
  }

  // Thanks
  if (hasAny(text, ["thanks", "shukriya", "thank you", "thnx", "ty "])) {
    return `Anytime ${name} 🫡 Chaudhry service 24/7.
Agli problem / bakchodi bhejo — inbox open hai.`;
  }

  // Bye
  if (hasAny(text, ["bye", "allah hafiz", "allah hafiz", "good night", "goodnight", "gn", "chalta", "see you"])) {
    return `Allah hafiz ${name}! Khayal rakhna.
Phir aana — net, dil, code, sab handle hai 🌙`;
  }

  // Yes / short affirmations after previous context — still give useful nudge
  if (/^(han|haan|yes|yeah|ok|okay|theek|thik|hm+|hmm+)$/.test(text)) {
    return `${name}, theek — ab next detail de do kya karna hai?
Jitna clear sawal, utna seedha Chaudhry jawab. Example: "internet nahi chal raha" ya "exam tension".`;
  }

  // Question-ish / problem-ish generic — answer with steps, not random roast
  if (
    text.includes("?") ||
    hasAny(text, ["kya", "kyun", "kaise", "kab", "kahan", "mera", "meri", "nahi", "problem", "issue", "help", "please"])
  ) {
    return `${name}, seedha scene:
Tumhari baat: "${raw.slice(0, 100)}${raw.length > 100 ? "…" : ""}"

Abhi ye karo:
1) Problem 1 line mein clear likho (example: "wifi connect hai lekin net nahi")
2) Kab se start hua + kya try kiya
3) Exact error / screenshot detail agar ho

Main usi pe numbered steps dunga. Half info pe half bakchodi — full info pe full fix 😎`;
  }

  // Generic fallback — still try to be useful, not random roast
  return `${name}, sun liya:
"${raw.slice(0, 90)}${raw.length > 90 ? "…" : ""}"

Batao clear goal:
• Problem fix? (net / code / study / mood)
• Advice chahiye?
• Sirf baat / bakchodi?

Jitna clear sawal, utna seedha Chaudhry jawab 🫡`;
}

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

function buildUserTurn(userName, text, opts = {}) {
  if (opts.groupMode) {
    const members = (opts.memberNames || []).join(", ") || "group members";
    const target = opts.randomMemberName || "kisi random member";
    return `GROUP CHAT MODE.
Group: ${opts.groupName || "group"}
Members: ${members}
Sender: ${userName}
Random member to playfully tag/answer-for/roast (friendly): ${target}

User ne @ai se kaha — pehle USEFUL jawab, phir bakchodi. Random member ko reply mein involve karo (jaise unki taraf se comment / light roast), lekin asal sawal ka jawab pehle:
${text}`;
  }

  return `User name: ${userName}\nUnka message (SEEDHA useful jawab pehle, phir 1–2 lines bakchodi):\n${text}`;
}

/** True if message tags Chaudhry via @ai / @chaudhry / @chaudhry_ai */
export function isChaudhryMention(content) {
  return /(?:^|[\s([{])@(?:ai|chaudhry(?:_ai)?)\b/i.test(String(content || ""));
}

export function pickRandomGroupMember(members, { excludeIds = [], botId } = {}) {
  const skip = new Set([...(excludeIds || []).map(String), botId ? String(botId) : ""].filter(Boolean));
  const humans = (members || []).filter((m) => {
    const id = String(m._id || m);
    if (skip.has(id)) return false;
    if (m.isBot) return false;
    if (m.username === CHAUDHRY.username) return false;
    return true;
  });
  if (!humans.length) return null;
  return humans[Math.floor(Math.random() * humans.length)];
}

export async function getRecentGroupContext(groupId, botId, limit = 8) {
  const msgs = await Message.find({
    groupId,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("senderId", "name username isBot")
    .lean();

  return msgs.reverse().map((m) => {
    const fromBot = String(m.senderId?._id || m.senderId) === String(botId) || m.senderId?.isBot;
    const name = m.senderId?.name || "member";
    const body = m.isDeleted ? "[deleted]" : String(m.content || "");
    return {
      role: fromBot ? "assistant" : "user",
      content: fromBot ? body : `${name}: ${body}`,
    };
  });
}

async function replyWithGroq(text, userName, history, turnOpts = {}) {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.filter((m) => m.content && m.content !== "[deleted]").slice(-8),
    { role: "user", content: buildUserTurn(userName, text, turnOpts) },
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
      max_tokens: 320,
      messages,
    }),
  });

  if (!res.ok) {
    console.error("Groq error:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function replyWithGemini(text, userName, history, turnOpts = {}) {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!key) return null;

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const contents = [];

  for (const m of history.filter((h) => h.content && h.content !== "[deleted]").slice(-8)) {
    contents.push({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    });
  }
  contents.push({ role: "user", parts: [{ text: buildUserTurn(userName, text, turnOpts) }] });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 320,
        },
      }),
    }
  );

  if (!res.ok) {
    console.error("Gemini error:", res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
  return reply || null;
}

/**
 * Free OpenAI-compatible LLM (llm7.io) — no user API key required.
 * Used when Groq/Gemini keys are missing so replies are not stuck on local templates.
 */
async function replyWithLlm7(text, userName, history, turnOpts = {}) {
  if (process.env.CHAUDHRY_DISABLE_LLM7 === "1") return null;

  const model = process.env.LLM7_MODEL || "default";
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.filter((m) => m.content && m.content !== "[deleted]").slice(-6),
    { role: "user", content: buildUserTurn(userName, text, turnOpts) },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);

  try {
    const res = await fetch("https://api.llm7.io/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: "Bearer unused",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.85,
        max_tokens: 280,
        messages,
      }),
    });

    if (!res.ok) {
      console.error("LLM7 error:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generate reply — Groq / Gemini / free LLM7, else local answers.
 */
export async function generateChaudhryReply(userMessage, userName = "bhai", opts = {}) {
  const text = String(userMessage || "").trim();
  // Message is saved before reply — drop trailing duplicate of this turn
  let history = opts.history || [];
  if (history.length) {
    const last = history[history.length - 1];
    if (last.role === "user") {
      const lastContent = String(last.content || "");
      if (lastContent === text || lastContent.endsWith(`: ${text}`)) {
        history = history.slice(0, -1);
      }
    }
  }

  const turnOpts = {
    groupMode: Boolean(opts.groupMode),
    groupName: opts.groupName,
    memberNames: opts.memberNames,
    randomMemberName: opts.randomMemberName,
  };

  try {
    const groqReply = await replyWithGroq(text, userName, history, turnOpts);
    if (groqReply) return groqReply;

    const geminiReply = await replyWithGemini(text, userName, history, turnOpts);
    if (geminiReply) return geminiReply;

    const llm7Reply = await replyWithLlm7(text, userName, history, turnOpts);
    if (llm7Reply) return llm7Reply;
  } catch (err) {
    console.error("Chaudhry LLM error:", err);
  }

  return localContextualReply(text, userName);
}

/** Which brain is active (for debugging / status). */
export function getChaudhryProvider() {
  if (process.env.GROQ_API_KEY?.trim()) return "groq";
  if (process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    return "gemini";
  }
  if (process.env.CHAUDHRY_DISABLE_LLM7 !== "1") return "llm7";
  return "local";
}

export { getRecentChatContext };

export function isChaudhryBotId(id, botId) {
  return String(id) === String(botId);
}
