"use client";

import Avatar, { formatTime } from "./Avatar";
import ThemeToggle from "./ThemeToggle";
import NotificationToggle from "./NotificationToggle";

/**
 * Left sidebar — chat list (contacts + groups) with search filter
 */
export default function Sidebar({
  user,
  chats,
  activeChat,
  onSelectChat,
  onOpenFind,
  onOpenCreateGroup,
  onLogout,
  filter,
  setFilter,
  mobileOpen,
}) {
  const filtered = chats.filter((c) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return (c.name || "").toLowerCase().includes(q) ||
      (c.username || "").toLowerCase().includes(q);
  });

  return (
    <aside
      className={`flex flex-col h-full bg-white/95 dark:bg-slate-900/95 border-r border-sky-100 dark:border-slate-700 w-full md:w-[340px] shrink-0 ${
        mobileOpen ? "flex" : "hidden md:flex"
      }`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-sky-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-sky-500 text-white font-bold flex items-center justify-center shadow-soft">
              S
            </div>
            <div>
              <h1 className="font-bold text-sky-700 dark:text-sky-400 leading-tight">SkyChat</h1>
              <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                {user?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationToggle />
            <ThemeToggle />
            <button
              type="button"
              onClick={onLogout}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-400 btn-ghost py-1"
              title="Log out"
            >
              Logout
            </button>
          </div>
        </div>

        <input
          className="input-field text-sm py-2"
          placeholder="Search chats…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />

        <div className="flex gap-2 mt-3">
          <button type="button" onClick={onOpenFind} className="btn-primary flex-1 text-sm py-2">
            Find People
          </button>
          <button
            type="button"
            onClick={onOpenCreateGroup}
            className="btn-ghost flex-1 text-sm py-2"
          >
            New Group
          </button>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto custom-scroll">
        {filtered.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-10 px-4">
            No chats yet. Find people or create a group to get started.
          </p>
        )}

        <ul>
          {filtered.map((chat) => {
            const isActive = activeChat?._id === chat._id && activeChat?.type === chat.type;
            const preview = chat.lastMessage?.content || "No messages yet";
            const time = chat.lastMessage?.createdAt
              ? formatTime(chat.lastMessage.createdAt)
              : "";

            return (
              <li key={`${chat.type}-${chat._id}`}>
                <button
                  type="button"
                  onClick={() => onSelectChat(chat)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition border-l-4 ${
                    isActive
                      ? "bg-sky-50 dark:bg-slate-800 border-sky-500"
                      : "border-transparent hover:bg-sky-50/70 dark:hover:bg-slate-800/70"
                  }`}
                >
                  <div className="relative shrink-0">
                    <Avatar
                      name={chat.name}
                      image={chat.type === "group" ? chat.image : chat.avatar}
                    />
                    {chat.unreadCount > 0 && !isActive && (
                      <span
                        className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"
                        title={`${chat.unreadCount} unread`}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`truncate ${
                          chat.unreadCount > 0 && !isActive
                            ? "font-bold text-slate-900 dark:text-white"
                            : "font-semibold text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        {chat.name}
                        {chat.isBot && (
                          <span className="ml-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                            Bot
                          </span>
                        )}
                        {chat.type === "group" && (
                          <span className="ml-1 text-[10px] font-medium text-sky-500 dark:text-sky-400 bg-sky-50 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            Group
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {chat.unreadCount > 0 && !isActive && (
                          <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                            {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                          </span>
                        )}
                        {time && (
                          <span
                            className={`text-[10px] ${
                              chat.unreadCount > 0 && !isActive
                                ? "text-red-500 font-semibold"
                                : "text-slate-400"
                            }`}
                          >
                            {time}
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      className={`text-xs truncate mt-0.5 ${
                        chat.unreadCount > 0 && !isActive
                          ? "text-slate-700 dark:text-slate-200 font-medium"
                          : "text-slate-500"
                      }`}
                    >
                      {preview}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
