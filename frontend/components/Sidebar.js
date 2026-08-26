"use client";

import Avatar, { formatTime } from "./Avatar";

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
      className={`flex flex-col h-full bg-white/95 border-r border-sky-100 w-full md:w-[340px] shrink-0 ${
        mobileOpen ? "flex" : "hidden md:flex"
      }`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-sky-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-sky-500 text-white font-bold flex items-center justify-center shadow-soft">
              S
            </div>
            <div>
              <h1 className="font-bold text-sky-700 leading-tight">SkyChat</h1>
              <p className="text-[11px] text-slate-400 truncate max-w-[140px]">
                {user?.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-slate-500 hover:text-sky-700 btn-ghost py-1"
            title="Log out"
          >
            Logout
          </button>
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
                      ? "bg-sky-50 border-sky-500"
                      : "border-transparent hover:bg-sky-50/70"
                  }`}
                >
                  <Avatar
                    name={chat.name}
                    image={chat.type === "group" ? chat.image : chat.avatar}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-800 truncate">
                        {chat.name}
                        {chat.type === "group" && (
                          <span className="ml-1 text-[10px] font-medium text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded">
                            Group
                          </span>
                        )}
                      </p>
                      {time && (
                        <span className="text-[10px] text-slate-400 shrink-0">{time}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{preview}</p>
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
