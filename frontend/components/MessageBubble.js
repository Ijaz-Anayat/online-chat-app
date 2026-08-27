"use client";

import { formatTime } from "./Avatar";

const SENDER_NAME_COLORS = [
  "text-violet-600 dark:text-violet-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-orange-600 dark:text-orange-400",
  "text-rose-600 dark:text-rose-400",
  "text-indigo-600 dark:text-indigo-400",
  "text-teal-600 dark:text-teal-400",
  "text-fuchsia-600 dark:text-fuchsia-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-lime-600 dark:text-lime-400",
  "text-pink-600 dark:text-pink-400",
];

function getSenderNameColor(sender) {
  if (!sender) return "text-sky-600 dark:text-sky-400";
  if (sender.isBot || sender.username === "chaudhry_ai") {
    return "text-amber-600 dark:text-amber-400";
  }
  const key = String(sender._id || sender.username || sender.name || "");
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i) * (i + 7)) % SENDER_NAME_COLORS.length;
  }
  return SENDER_NAME_COLORS[hash];
}

function renderContent(content, isMine) {
  const text = String(content || "");
  const parts = text.split(/(@(?:ai|chaudhry(?:_ai)?)\b)/gi);
  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, i) => {
    if (/^@(?:ai|chaudhry(?:_ai)?)$/i.test(part)) {
      return (
        <span
          key={i}
          className={
            isMine
              ? "font-semibold text-sky-100 underline decoration-sky-200/80"
              : "font-semibold text-sky-600 dark:text-sky-400"
          }
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/**
 * Single message bubble with hover "Delete for me"
 */
export default function MessageBubble({ message, isMine, isGroupChat = false, onDelete }) {
  const sender = message.senderId;
  const deleted = message.isDeleted || message._deletedForMe;
  const time = formatTime(message.createdAt);
  const senderColor = getSenderNameColor(sender);

  return (
    <div className={`group flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`relative max-w-[78%] sm:max-w-[65%]`}>
        {!isMine && sender?.name && (
          <p className={`text-[11px] font-semibold mb-0.5 ml-1 ${isGroupChat ? senderColor : "text-sky-600 dark:text-sky-400"}`}>
            {sender.name}
            {(sender.isBot || sender.username === "chaudhry_ai") && (
              <span className="ml-1 text-[9px] uppercase tracking-wide text-amber-600 dark:text-amber-400 font-bold">
                bot
              </span>
            )}
          </p>
        )}

        <div
          className={`rounded-2xl px-3.5 py-2 shadow-bubble ${
            isMine
              ? "bg-sky-500 text-white rounded-br-md"
              : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-sky-50 dark:border-slate-600 rounded-bl-md"
          }`}
        >
          {deleted ? (
            <p className={`text-sm italic ${isMine ? "text-sky-100" : "text-slate-400"}`}>
              This message was deleted
            </p>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">
              {renderContent(message.content, isMine)}
            </p>
          )}

          <div
            className={`mt-1 flex items-center gap-2 justify-end text-[10px] ${
              isMine ? "text-sky-100" : "text-slate-400"
            }`}
          >
            <span>{time}</span>
            {isMine && !deleted && (
              <span title={message.status === "read" ? "Read" : "Sent"} className="tracking-tighter">
                {message.status === "read" ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>

        {/* Delete for me — visible on hover */}
        {!deleted && (
          <button
            type="button"
            onClick={() => onDelete(message._id)}
            title="Delete for me"
            className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition text-xs px-2 py-1 rounded-lg bg-white dark:bg-slate-700 border border-sky-100 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 shadow-sm ${
              isMine ? "-left-20" : "-right-20"
            }`}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
