"use client";

import { formatTime } from "./Avatar";

/**
 * Single message bubble with hover "Delete for me"
 */
export default function MessageBubble({ message, isMine, onDelete }) {
  const sender = message.senderId;
  const deleted = message.isDeleted || message._deletedForMe;
  const time = formatTime(message.createdAt);

  return (
    <div className={`group flex ${isMine ? "justify-end" : "justify-start"} mb-2`}>
      <div className={`relative max-w-[78%] sm:max-w-[65%]`}>
        {!isMine && sender?.name && (
          <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium mb-0.5 ml-1">
            {sender.name}
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
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}

          <div
            className={`mt-1 flex items-center gap-2 justify-end text-[10px] ${
              isMine ? "text-sky-100" : "text-slate-400"
            }`}
          >
            <span>{time}</span>
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
