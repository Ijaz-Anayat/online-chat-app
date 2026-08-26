"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { contactsApi, groupsApi, messagesApi } from "@/lib/api";
import { connectSocket, getSocket } from "@/lib/socket";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import FindPeople from "@/components/FindPeople";
import CreateGroup from "@/components/CreateGroup";
import GroupInfo from "@/components/GroupInfo";

/**
 * Main chat dashboard — sidebar + chat window + panels
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
  const [panel, setPanel] = useState(null); // 'find' | 'createGroup' | 'groupInfo' | null
  const [showChatMobile, setShowChatMobile] = useState(false);
  const [typingLabel, setTypingLabel] = useState("");
  const [listLoading, setListLoading] = useState(true);

  // Protect route
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const loadLists = useCallback(async () => {
    try {
      const [cData, gData] = await Promise.all([contactsApi.list(), groupsApi.list()]);
      setContacts(cData.contacts || []);
      setGroups(gData.groups || []);
    } catch (err) {
      console.error("Failed to load chats:", err);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadLists();
  }, [user, loadLists]);

  // Merge contacts + groups into one sorted chat list
  const chats = useMemo(() => {
    const merged = [...contacts, ...groups];
    merged.sort((a, b) => {
      const ta = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const tb = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return tb - ta;
    });
    return merged;
  }, [contacts, groups]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChat) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setMessagesLoading(true);
      try {
        const data = await messagesApi.get(activeChat._id, activeChat.type);
        if (!cancelled) setMessages(data.messages || []);
      } catch (err) {
        console.error(err);
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeChat?._id, activeChat?.type]);

  // Socket.io listeners
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();
    if (!socket) return;

    const onReceive = ({ message }) => {
      if (!message) return;

      const senderId = message.senderId?._id || message.senderId;
      const isGroup = !!message.groupId;
      const chatId = isGroup
        ? String(message.groupId)
        : String(senderId) === String(user._id)
        ? String(message.receiverId)
        : String(senderId);

      // Update message list if this chat is open
      setMessages((prev) => {
        if (!activeChat) return prev;
        const activeId = String(activeChat._id);
        const matches =
          (isGroup && activeChat.type === "group" && activeId === chatId) ||
          (!isGroup && activeChat.type === "dm" && activeId === chatId);
        if (!matches) return prev;
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });

      // Update last-message preview in sidebar
      const preview = {
        content: message.isDeleted ? "This message was deleted" : message.content,
        createdAt: message.createdAt,
        senderId,
        isDeleted: message.isDeleted,
      };

      if (isGroup) {
        setGroups((prev) => {
          const exists = prev.some((g) => String(g._id) === chatId);
          if (!exists) {
            // Refresh lists if a new group message arrives
            loadLists();
            return prev;
          }
          return prev
            .map((g) =>
              String(g._id) === chatId ? { ...g, lastMessage: preview } : g
            )
            .sort((a, b) => {
              const ta = a.lastMessage?.createdAt
                ? new Date(a.lastMessage.createdAt).getTime()
                : 0;
              const tb = b.lastMessage?.createdAt
                ? new Date(b.lastMessage.createdAt).getTime()
                : 0;
              return tb - ta;
            });
        });
      } else {
        setContacts((prev) => {
          const exists = prev.some((c) => String(c._id) === chatId);
          if (!exists) {
            loadLists();
            return prev;
          }
          return prev
            .map((c) =>
              String(c._id) === chatId ? { ...c, lastMessage: preview } : c
            )
            .sort((a, b) => {
              const ta = a.lastMessage?.createdAt
                ? new Date(a.lastMessage.createdAt).getTime()
                : 0;
              const tb = b.lastMessage?.createdAt
                ? new Date(b.lastMessage.createdAt).getTime()
                : 0;
              return tb - ta;
            });
        });
      }
    };

    const onDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, _deletedForMe: true, content: "" } : m
        )
      );
    };

    const onTyping = ({ chatId, username, isTyping, userId }) => {
      if (!activeChat || String(userId) === String(user._id)) return;
      const matches =
        (activeChat.type === "dm" && String(activeChat._id) === String(userId)) ||
        (activeChat.type === "group" && String(activeChat._id) === String(chatId));
      if (!matches) return;
      setTypingLabel(isTyping ? `${username} is typing…` : "");
    };

    const onGroupUpdated = ({ group }) => {
      if (!group) return;
      setGroups((prev) =>
        prev.map((g) => (String(g._id) === String(group._id) ? { ...g, ...group } : g))
      );
      setActiveChat((prev) =>
        prev && prev.type === "group" && String(prev._id) === String(group._id)
          ? { ...prev, ...group, type: "group" }
          : prev
      );
    };

    const onAddedToGroup = ({ group }) => {
      if (!group) return;
      const socketInst = getSocket();
      socketInst?.emit("join_group", { groupId: group._id });
      setGroups((prev) => {
        if (prev.some((g) => String(g._id) === String(group._id))) return prev;
        return [{ ...group, type: "group", lastMessage: null }, ...prev];
      });
    };

    const onRemoved = ({ groupId }) => {
      setGroups((prev) => prev.filter((g) => String(g._id) !== String(groupId)));
      setActiveChat((prev) =>
        prev && prev.type === "group" && String(prev._id) === String(groupId)
          ? null
          : prev
      );
      setPanel(null);
      setShowChatMobile(false);
    };

    socket.on("receive_message", onReceive);
    socket.on("message_deleted", onDeleted);
    socket.on("typing", onTyping);
    socket.on("group_updated", onGroupUpdated);
    socket.on("added_to_group", onAddedToGroup);
    socket.on("removed_from_group", onRemoved);

    return () => {
      socket.off("receive_message", onReceive);
      socket.off("message_deleted", onDeleted);
      socket.off("typing", onTyping);
      socket.off("group_updated", onGroupUpdated);
      socket.off("added_to_group", onAddedToGroup);
      socket.off("removed_from_group", onRemoved);
    };
  }, [user, activeChat, loadLists]);

  const handleSelectChat = (chat) => {
    setActiveChat(chat);
    setPanel(null);
    setShowChatMobile(true);
    setTypingLabel("");

    const socket = getSocket();
    if (chat.type === "group") {
      socket?.emit("join_chat", { chatId: chat._id, type: "group" });
    }
  };

  const handleSend = async (content) => {
    if (!activeChat) return;

    const payload =
      activeChat.type === "group"
        ? { content, groupId: activeChat._id }
        : { content, receiverId: activeChat._id };

    const socket = getSocket();
    if (socket?.connected) {
      await new Promise((resolve, reject) => {
        socket.emit("send_message", payload, (res) => {
          if (res?.error) reject(new Error(res.error));
          else resolve(res);
        });
      });
    } else {
      await messagesApi.send(payload);
    }
  };

  const handleDelete = async (messageId) => {
    try {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit("delete_message", { messageId });
      } else {
        await messagesApi.softDelete(messageId);
      }
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, _deletedForMe: true, content: "" } : m
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
    const socket = getSocket();
    socket?.emit("join_group", { groupId: group._id });
    setGroups((prev) => [{ ...group, type: "group", lastMessage: null }, ...prev]);
    handleSelectChat({ ...group, type: "group" });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-4 border-sky-200 border-t-sky-500 animate-spin" />
      </div>
    );
  }

  const showSidePanel = panel !== null;

  return (
    <div className="h-[100dvh] flex overflow-hidden">
      {/* Sidebar / panels */}
      <div
        className={`${
          showChatMobile && !showSidePanel ? "hidden md:flex" : "flex"
        } h-full w-full md:w-[340px] shrink-0 flex-col`}
      >
        {panel === "find" && (
          <div className="h-full w-full bg-white border-r border-sky-100">
            <FindPeople
              onContactAdded={handleContactAdded}
              onClose={() => setPanel(null)}
            />
          </div>
        )}
        {panel === "createGroup" && (
          <div className="h-full w-full bg-white border-r border-sky-100">
            <CreateGroup
              contacts={contacts}
              onCreated={handleGroupCreated}
              onClose={() => setPanel(null)}
            />
          </div>
        )}
        {panel === "groupInfo" && activeChat?.type === "group" && (
          <div className="h-full w-full bg-white border-r border-sky-100 md:hidden">
            <GroupInfo
              groupId={activeChat._id}
              currentUser={user}
              onUpdated={(g) =>
                setActiveChat((prev) => ({ ...prev, ...g, type: "group" }))
              }
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

      {/* Main chat */}
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
          typingLabel={typingLabel}
          loading={messagesLoading}
        />
      </div>

      {/* Desktop group info side drawer */}
      {panel === "groupInfo" && activeChat?.type === "group" && (
        <div className="hidden md:flex w-[320px] h-full border-l border-sky-100 bg-white shrink-0">
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
