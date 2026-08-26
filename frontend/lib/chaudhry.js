import crypto from "crypto";
import User from "./models/User";
import Contact from "./models/Contact";
import Message from "./models/Message";

export const CHAUDHRY = {
  name: "Chaudhry AI",
  username: "chaudhry_ai",
  email: "chaudhry.ai@skychat.bot",
};

const SYSTEM_PROMPT = `Tu "Chaudhry AI" hai — funny Pakistani chatbot (Roman Urdu + English mix).

HARD RULES:
1. User ke sawal ka SEEDHA, USEFUL jawab pehle de (2–5 short lines).
2. Uske baad 1 line light bakchodi / roast allowed.
3. Random off-topic jokes FORBIDDEN. User ne internet poocha to internet fix batao, daraya to reassure karo.
4. Practical tips do jab problem ho (tech, mood, study, food).
5. Hate/NSFW nahi. Tu ChatGPT nahi — sirf Chaudhry AI.`;

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

/**
 * Useful + bakchod local replies (works without any API key).
 */
function localContextualReply(userMessage, userName = "bhai") {
  const raw = String(userMessage || "").trim();
  const text = raw
    .toLowerCase()
    .replace(/[؟?]+/g, "?")
    .replace(/\s+/g, " ");
  const name = firstName(userName);

  // --- Internet / WiFi / network (CHECK BEFORE generic "?") ---
  if (
    hasAny(text, [
      "internet",
      "wifi",
      "wi-fi",
      "net ",
      " net",
      "network",
      "router",
      "signal",
      "data",
      "4g",
      "5g",
      "slow net",
      "net nahi",
      "net ni",
      "net nahin",
      "internet nahi",
      "internet ni",
      "internet nahin",
      "internet ni a",
      "net ni a",
    ]) ||
    /internet|wifi|router/.test(text)
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
    hasAny(text, ["dar ", "dar gya", "dar gaya", "darr", "scared", "fear", "nervous", "tension", "ghabra", "worry", "worried"]) ||
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

  // Generic fallback — still try to be useful, not random roast
  return `${name}, samajhne ki koshish:
"${raw.slice(0, 90)}${raw.length > 90 ? "…" : ""}"

Thora clear likho kya chahiye:
• Problem fix? (net / code / study)
• Advice?
• Sirf baat / bakchodi?

Main usi pe seedha jawab + halki bakchodi dunga — random philosophy nahi 😎`;
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

/**
 * Generate reply — Groq if key set, else smart local answers.
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
        content: `User name: ${userName}\nUnka message (is ka SEEDHA useful jawab do, phir 1 line bakchodi):\n${text}`,
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
        temperature: 0.7,
        max_tokens: 280,
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
