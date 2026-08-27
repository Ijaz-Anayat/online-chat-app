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

const GROUP_SYSTEM_PROMPT = `You are "Chaudhry AI" — SkyChat group ka sab se zyada bakchod member.

GROUP CHAT RULES (STRICT):
1. NEVER repeat the user's message back ("sun liya", "tumhari baat", etc.) — FORBIDDEN.
2. NEVER ask "batao clear goal" or generic clarification — jawab do, roast karo, done.
3. NEVER sound like a customer support bot or formal AI.

PERSONALITY:
- Full desi group-chat energy: Roman Urdu + English, tharki-halki comedy, sarcasm, roasts.
- Creative, unpredictable, meme-worthy lines — har reply alag feel ho.
- Mild Pakistani slang OK (oye, yaar, scene, uff, pagal, zaleel, etc.) — playful only.
- Emojis use karo: 😂 💀 🗿 🔥 😭

MANDATORY REPLY STRUCTURE:
[2-4 lines: useful/helpful answer to what they asked @ai]
[2-4 lines: CREATIVE roast — MUST name the "roast target" member given in the prompt]
[Optional 1 line: funny side comment tagging the "sidekick" member OR pretending they said something]

ROAST RULES:
- Roast target ka NAAM zaroor likho (@name style optional).
- Roast specific & creative ho — generic "haha funny" nahi.
- Examples of GOOD roasts:
  • "Oye {name}, tu group mein itna silent rehta hai ke lagta hai mute pe paid subscription hai 😂"
  • "{name} bhai dimagh mein loading icon ghoom raha hai shayad — tabhi @ai bulaya {sender} ne 💀"
  • "{name} ko lagta hai net slow hai — asal mein unki typing speed 2G pe stuck hai 🗿"
- Roast the QUESTION ASKER lightly too if fun fits — but main roast = target member.
- Still be a friend — no real cruelty, no hate, no slurs.

LENGTH: 4-8 short lines total. Punchy. Group chat readable.`;

function getSystemPrompt(turnOpts = {}) {
  return turnOpts.groupMode ? GROUP_SYSTEM_PROMPT : SYSTEM_PROMPT;
}

function getReplyTemperature(turnOpts = {}) {
  return turnOpts.groupMode ? 0.98 : 0.85;
}

function isBoringChaudhryReply(reply) {
  const r = String(reply || "").toLowerCase();
  if (!r || r.length < 35) return true;
  const boring =
    /sun liya|batao clear goal|jitna clear sawal|problem fix\?|advice chahiye|sirf baat|seedha scene|thora clear likho|main usi pe numbered|half info pe half/i;
  return boring.test(r);
}

/** Strip @ai tag from message for cleaner processing */
function stripAiMention(text) {
  return String(text || "")
    .replace(/@(?:ai|chaudhry(?:_ai)?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Creative group roast fallback when LLM is too generic */
function groupRoastFallback(text, userName, opts = {}) {
  const clean = stripAiMention(text) || text;
  const useful = localContextualReply(clean, userName);
  const sender = firstName(userName);
  const roastTarget = opts.roastTargetName || opts.randomMemberName || "yaar";
  const sidekick = opts.sidekickName;

  const roasts = [
    `Oye ${roastTarget} — tu itna chup kyun rehta hai group mein? Keyboard kharab hai ya attitude? 😂`,
    `${roastTarget} bhai, ${sender} ne @ai bulaya hai — tu ab tak "..." pe stuck hai kya? 💀`,
    `Group PSA: ${roastTarget} ki soch abhi bhi loading pe hai. ${sender} ne sahi @ai tag kiya 🔥`,
    `${roastTarget}, agar dimagh mein bhi WiFi hota to shayad reply bhi aa jata — ab Chaudhry handle karega 🗿`,
    `Scene ye hai ke ${sender} serious hai aur ${roastTarget} abhi bhi last week's meme dekh raha hai 😭`,
    `${roastTarget} ko lagta hai group chat WhatsApp status hai — sirf dekhna hai, likhna nahi 😂`,
    `Breaking: ${roastTarget} ne socha group mein sirf ghost mode on rehna hai — Chaudhry ne pakar liya 👻`,
  ];

  const sideLines = sidekick && sidekick !== roastTarget
    ? [
        `\n\nSide note: ${sidekick} keh raha tha "${sender} phir se @ai bulayega" — sahi pakda tha usne 😂`,
        `\n\n${sidekick} ne whisper kiya: "${roastTarget} ko roast mat karo" — ab zyada hoga roast 💀`,
        `\n\n${sidekick} bhi kehta hai: is group mein ${roastTarget} aur Chaudhry hi kaam ke hain 🗿`,
      ]
    : [""];

  const roast = roasts[Math.floor(Math.random() * roasts.length)];
  const side = sideLines[Math.floor(Math.random() * sideLines.length)];
  return `${useful}\n\n${roast}${side}`;
}

function finalizeReply(reply, text, userName, turnOpts) {
  if (!turnOpts.groupMode) return reply;
  if (reply && !isBoringChaudhryReply(reply)) return reply;
  return groupRoastFallback(text, userName, turnOpts);
}

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
    const roastTarget = opts.roastTargetName || opts.randomMemberName || "ek random member";
    const sidekick = opts.sidekickName || "koi aur member";
    const clean = stripAiMention(text) || text;
    const sender = firstName(userName);

    return `GROUP CHAT — ${opts.groupName || "group"}

Members: ${members}
Sender (@ai tag kiya): ${userName} (${sender})
ROAST TARGET ( naam zaroor lo, creative roast karo ): ${roastTarget}
SIDEKICK ( optional funny mention ): ${sidekick}

User message: "${clean}"

ZAROORI:
- User ka message repeat mat karo
- Generic template mat do
- Pehle useful jawab, phir ${roastTarget} ko CREATIVE roast (naam ke sath)
- ${sidekick} ko ek chhoti funny line mein involve kar sakte ho
- Roman Urdu group chat style — full bakchodi mode ON 🔥`;
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

/** Pick two different members for roast + sidekick banter */
export function pickGroupRoastTargets(members, { botId, senderId } = {}) {
  const skipSender = senderId ? [senderId] : [];
  const pool = [];
  const seen = new Set();
  for (const m of members || []) {
    const id = String(m._id || m);
    if (seen.has(id)) continue;
    seen.add(id);
    if (m.isBot || m.username === CHAUDHRY.username) continue;
    if (botId && id === String(botId)) continue;
    pool.push(m);
  }

  // Prefer roasting someone other than sender
  let roastPool = pool.filter((m) => !senderId || String(m._id) !== String(senderId));
  if (!roastPool.length) roastPool = pool;
  if (!roastPool.length) return { roastTarget: null, sidekick: null };

  const roastTarget = roastPool[Math.floor(Math.random() * roastPool.length)];
  const others = pool.filter((m) => String(m._id) !== String(roastTarget._id));
  const sidekick = others.length
    ? others[Math.floor(Math.random() * others.length)]
    : null;

  return { roastTarget, sidekick };
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
    { role: "system", content: getSystemPrompt(turnOpts) },
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
      temperature: getReplyTemperature(turnOpts),
      max_tokens: turnOpts.groupMode ? 400 : 320,
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
        systemInstruction: { parts: [{ text: getSystemPrompt(turnOpts) }] },
        contents,
        generationConfig: {
          temperature: getReplyTemperature(turnOpts),
          maxOutputTokens: turnOpts.groupMode ? 400 : 320,
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

  const model = process.env.LLM7_MODEL || (turnOpts.groupMode ? "fast" : "default");
  const messages = [
    { role: "system", content: getSystemPrompt(turnOpts) },
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
        temperature: getReplyTemperature(turnOpts),
        max_tokens: turnOpts.groupMode ? 380 : 280,
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
    roastTargetName: opts.roastTargetName,
    sidekickName: opts.sidekickName,
  };

  try {
    const groqReply = await replyWithGroq(text, userName, history, turnOpts);
    if (groqReply) return finalizeReply(groqReply, text, userName, turnOpts);

    const geminiReply = await replyWithGemini(text, userName, history, turnOpts);
    if (geminiReply) return finalizeReply(geminiReply, text, userName, turnOpts);

    const llm7Reply = await replyWithLlm7(text, userName, history, turnOpts);
    if (llm7Reply) return finalizeReply(llm7Reply, text, userName, turnOpts);
  } catch (err) {
    console.error("Chaudhry LLM error:", err);
  }

  if (turnOpts.groupMode) {
    return groupRoastFallback(text, userName, turnOpts);
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
