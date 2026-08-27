"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import MessageBubble from "./MessageBubble";

/**
 * Main chat panel — messages + composer
 */
export default function ChatWindow({
  chat,
  messages,
  currentUser,
  onSend,
  onDelete,
  onClearChat,
  onBack,
  onOpenInfo,
  loading,
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setText("");
    inputRef.current?.focus();
  }, [chat?._id, chat?.type]);

  if (!chat) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-sky-50/80 to-white dark:from-slate-900 dark:to-slate-800 text-center px-6">
        <div className="h-20 w-20 rounded-3xl bg-sky-500 text-white text-4xl font-bold flex items-center justify-center shadow-soft mb-4">
          S
        </div>
        <h2 className="text-2xl font-bold text-sky-700 dark:text-sky-400">SkyChat</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
          Select a conversation or find people to start messaging in real time.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      await onSend(content);
      setText("");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleClearChat = async () => {
    if (!onClearChat || clearing) return;
    const label = chat.type === "group" ? "this group chat" : `chat with ${chat.name}`;
    if (
      !confirm(
        `Clear all messages in ${label}?\n\nThis only hides them for you. Messages stay in the database.`
      )
    ) {
      return;
    }
    setClearing(true);
    try {
      await onClearChat();
    } finally {
      setClearing(false);
    }
  };

  const hasChaudhry =
    chat.type === "group" &&
    (chat.members || []).some((m) => m?.isBot || m?.username === "chaudhry_ai");

  const placeholder =
    chat.type === "group" && hasChaudhry
      ? "Message… or @ai for Chaudhry"
      : chat.isBot
        ? "Bakchodi shuru karo…"
        : "Type a message…";

  return (
    <div className="flex flex-col flex-1 h-full min-w-0 bg-sky-50/40 dark:bg-slate-900/60">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-3 sm:px-4 py-3 bg-white/95 dark:bg-slate-900/95 border-b border-sky-100 dark:border-slate-700 shadow-sm">
        <button
          type="button"
          onClick={onBack}
          className="md:hidden btn-ghost py-1 px-2 text-sm"
        >
          ←
        </button>
        <Avatar
          name={chat.name}
          image={chat.type === "group" ? chat.image : chat.avatar}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{chat.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
            {chat.type === "group"
              ? `${chat.members?.length || "…"} members${hasChaudhry ? " · @ai ready" : ""}`
              : chat.isBot
                ? "Fun & bakchodi mode 24/7"
                : `@${chat.username || ""}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              disabled={clearing}
              className="btn-ghost text-sm py-1.5 text-red-500 hover:text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50"
              title="Clear all messages for you"
            >
              {clearing ? "…" : "Clear"}
            </button>
          )}
          {chat.type === "group" && (
            <button type="button" onClick={onOpenInfo} className="btn-ghost text-sm py-1.5">
              Info
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scroll px-3 sm:px-6 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 rounded-full border-4 border-sky-200 dark:border-slate-600 border-t-sky-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-slate-400 text-sm py-16">
            No messages yet. Say hello!
            {hasChaudhry ? " Tag @ai to wake Chaudhry." : ""}
          </p>
        ) : (
          messages.map((m) => {
            const senderId = m.senderId?._id || m.senderId;
            const isMine = String(senderId) === String(currentUser._id);
            return (
              <MessageBubble
                key={m._id}
                message={m}
                isMine={isMine}
                onDelete={onDelete}
              />
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 sm:px-4 py-3 bg-white/95 dark:bg-slate-900/95 border-t border-sky-100 dark:border-slate-700"
      >
        <input
          ref={inputRef}
          className="input-field flex-1"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
        />
        <button
          type="submit"
          className="btn-primary shrink-0 px-5"
          disabled={!text.trim() || sending}
        >
          Send
        </button>
      </form>
    </div>
  );
}
