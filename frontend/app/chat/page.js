"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { contactsApi, groupsApi, messagesApi } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import FindPeople from "@/components/FindPeople";
import CreateGroup from "@/components/CreateGroup";
import GroupInfo from "@/components/GroupInfo";

const POLL_MESSAGES_MS = 3000;
const POLL_LISTS_MS = 5000;

/**
 * Main chat dashboard — polling replaces Socket.io (Vercel-compatible).
 */
export default function ChatPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [panel, setPanel] = useState(null);
  const [showChatMobile, setShowChatMobile] = useState(false);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const loadLists = useCallback(async () => {
    try {
      const [cData, gData] = await Promise.all([contactsApi.list(), groupsApi.list()]);
      setContacts((prev) => {
        const list = cData.contacts || [];
        // Keep active DM unread cleared while chat is open
        return list.map((c) => {
          if (
            activeChat?.type === "dm" &&
            String(activeChat._id) === String(c._id)
          ) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        });
      });
      setGroups((prev) => {
        const list = gData.groups || [];
        return list.map((g) => {
          if (
            activeChat?.type === "group" &&
            String(activeChat._id) === String(g._id)
          ) {
            return { ...g, unreadCount: 0 };
          }
          return g;
        });
      });
    } catch (err) {
      console.error("Failed to load chats:", err);
    } finally {
      setListLoading(false);
    }
  }, [activeChat?._id, activeChat?.type]);

  const loadMessages = useCallback(async (chat, silent = false) => {
    if (!chat) return;
    if (!silent) setMessagesLoading(true);
    try {
      const data = await messagesApi.get(chat._id, chat.type);
      setMessages(data.messages || []);
    } catch (err) {
      console.error(err);
      if (!silent) setMessages([]);
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  }, []);

  const markChatAsRead = useCallback(async (chat) => {
    if (!chat) return;
    try {
      await messagesApi.markRead(chat._id, chat.type);
      if (chat.type === "group") {
        setGroups((prev) =>
          prev.map((g) =>
            String(g._id) === String(chat._id) && g.unreadCount
              ? { ...g, unreadCount: 0 }
              : g
          )
        );
      } else {
        setContacts((prev) =>
          prev.map((c) =>
            String(c._id) === String(chat._id) && c.unreadCount
              ? { ...c, unreadCount: 0 }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Mark read failed:", err);
    }
  }, []);

  useEffect(() => {
    if (user) loadLists();
  }, [user, loadLists]);

  // Poll chat lists periodically
  useEffect(() => {
    if (!user) return;
    const id = setInterval(loadLists, POLL_LISTS_MS);
    return () => clearInterval(id);
  }, [user, loadLists]);

  const chats = useMemo(() => {
    const merged = [...contacts, ...groups];
    merged.sort((a, b) => {
      const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return tb - ta;
    });
    return merged;
  }, [contacts, groups]);

  // Load + poll messages for active chat; mark as read when opened
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    const chat = activeChat;
    loadMessages(chat);
    markChatAsRead(chat);

    const id = setInterval(() => {
      loadMessages(chat, true);
      markChatAsRead(chat);
    }, POLL_MESSAGES_MS);

    return () => clearInterval(id);
    // Only re-run when switching chats (id/type), not on unreadCount updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChat?._id, activeChat?.type, loadMessages, markChatAsRead]);

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setPanel(null);
    setShowChatMobile(true);
    // Optimistic: hide red dot immediately
    if (chat.type === "group") {
      setGroups((prev) =>
        prev.map((g) => (String(g._id) === String(chat._id) ? { ...g, unreadCount: 0 } : g))
      );
    } else {
      setContacts((prev) =>
        prev.map((c) => (String(c._id) === String(chat._id) ? { ...c, unreadCount: 0 } : c))
      );
    }
  };

  const handleSend = async (content) => {
    if (!activeChat) return;

    const payload =
      activeChat.type === "group"
        ? { content, groupId: activeChat._id }
        : { content, receiverId: activeChat._id };

    const data = await messagesApi.send(payload);
    if (data.message) {
      setMessages((prev) => {
        let next = prev;
        if (!prev.some((m) => m._id === data.message._id)) {
          next = [...prev, data.message];
        }
        if (data.botMessage && !next.some((m) => m._id === data.botMessage._id)) {
          next = [...next, data.botMessage];
        }
        return next;
      });
    }
    loadLists();
  };

  const handleDelete = async (messageId) => {
    try {
      await messagesApi.softDelete(messageId);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, isDeleted: true, _deletedForMe: true, content: "" }
            : m
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleContactAdded = (contact) => {
    setContacts((prev) => {
      if (prev.some((c) => c._id === contact._id)) return prev;
      return [{ ...contact, type: "dm", lastMessage: null }, ...prev];
    });
  };

  const handleGroupCreated = (group) => {
    setGroups((prev) => [{ ...group, type: "group", lastMessage: null }, ...prev]);
    handleSelectChat({ ...group, type: "group" });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-sky-200 dark:border-slate-600 border-t-sky-500 animate-spin" />
      </div>
    );
  }

  const showSidePanel = panel !== null;

  return (
    <div className="h-[100dvh] flex overflow-hidden">
      <div
        className={`${
          showChatMobile && !showSidePanel ? "hidden md:flex" : "flex"
        } h-full w-full md:w-[340px] shrink-0 flex-col`}
      >
        {panel === "find" && (
          <div className="h-full w-full bg-white dark:bg-slate-900 border-r border-sky-100 dark:border-slate-700">
            <FindPeople onContactAdded={handleContactAdded} onClose={() => setPanel(null)} />
          </div>
        )}
        {panel === "createGroup" && (
          <div className="h-full w-full bg-white dark:bg-slate-900 border-r border-sky-100 dark:border-slate-700">
            <CreateGroup
              contacts={contacts}
              onCreated={handleGroupCreated}
              onClose={() => setPanel(null)}
            />
          </div>
        )}
        {panel === "groupInfo" && activeChat?.type === "group" && (
          <div className="h-full w-full bg-white dark:bg-slate-900 border-r border-sky-100 dark:border-slate-700 md:hidden">
            <GroupInfo
              groupId={activeChat._id}
              currentUser={user}
              onUpdated={(g) => {
                setActiveChat((prev) => ({ ...prev, ...g, type: "group" }));
                setGroups((prev) =>
                  prev.map((x) =>
                    String(x._id) === String(g._id) ? { ...x, ...g, type: "group" } : x
                  )
                );
              }}
              onLeft={(id) => {
                setGroups((prev) => prev.filter((g) => String(g._id) !== String(id)));
                setActiveChat(null);
                setPanel(null);
                setShowChatMobile(false);
              }}
              onClose={() => setPanel(null)}
            />
          </div>
        )}
        {!showSidePanel && (
          <Sidebar
            user={user}
            chats={listLoading ? [] : chats}
            activeChat={activeChat}
            onSelectChat={handleSelectChat}
            onOpenFind={() => setPanel("find")}
            onOpenCreateGroup={() => setPanel("createGroup")}
            onLogout={handleLogout}
            filter={filter}
            setFilter={setFilter}
            mobileOpen={!showChatMobile}
          />
        )}
      </div>

      <div
        className={`${
          showChatMobile || activeChat ? "flex" : "hidden md:flex"
        } flex-1 h-full min-w-0`}
      >
        <ChatWindow
          chat={activeChat}
          messages={messages}
          currentUser={user}
          onSend={handleSend}
          onDelete={handleDelete}
          onBack={() => {
            setShowChatMobile(false);
            setPanel(null);
          }}
          onOpenInfo={() => setPanel("groupInfo")}
          loading={messagesLoading}
        />
      </div>

      {panel === "groupInfo" && activeChat?.type === "group" && (
        <div className="hidden md:flex w-[320px] h-full border-l border-sky-100 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
          <GroupInfo
            groupId={activeChat._id}
            currentUser={user}
            onUpdated={(g) => {
              setActiveChat((prev) => ({ ...prev, ...g, type: "group" }));
              setGroups((prev) =>
                prev.map((x) =>
                  String(x._id) === String(g._id) ? { ...x, ...g, type: "group" } : x
                )
              );
            }}
            onLeft={(id) => {
              setGroups((prev) => prev.filter((g) => String(g._id) !== String(id)));
              setActiveChat(null);
              setPanel(null);
            }}
            onClose={() => setPanel(null)}
          />
        </div>
      )}
    </div>
  );
}
