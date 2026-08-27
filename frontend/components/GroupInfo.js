"use client";

import { useEffect, useState } from "react";
import { groupsApi, usersApi, contactsApi } from "@/lib/api";
import Avatar from "./Avatar";

/**
 * Group info: members, admin add/remove, leave
 */
export default function GroupInfo({ groupId, currentUser, onUpdated, onLeft, onClose }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await groupsApi.get(groupId);
      setGroup(data.group);
      onUpdated?.(data.group);
    } catch (err) {
      setError(err.message || "Failed to load group");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await usersApi.search(search.trim());
        const memberIds = (group?.members || []).map((m) => m._id);
        setSearchResults((data.users || []).filter((u) => !memberIds.includes(u._id)));
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, group]);

  const isAdmin = group?.admin?._id === currentUser?._id;
  const hasChaudhry = (group?.members || []).some(
    (m) => m.isBot || m.username === "chaudhry_ai"
  );

  const handleAddChaudhry = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await groupsApi.addChaudhry(groupId);
      setGroup(data.group);
      onUpdated?.(data.group);
    } catch (err) {
      setError(err.message || "Failed to add Chaudhry AI");
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (memberId) => {
    setBusy(true);
    setError("");
    try {
      // Ensure they are a contact first (optional convenience)
      try {
        await contactsApi.add(memberId);
      } catch {
        // ignore if already contact
      }
      const data = await groupsApi.addMember(groupId, memberId);
      setGroup(data.group);
      onUpdated?.(data.group);
      setSearch("");
      setSearchResults([]);
    } catch (err) {
      setError(err.message || "Failed to add member");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!confirm("Remove this member from the group?")) return;
    setBusy(true);
    setError("");
    try {
      const data = await groupsApi.removeMember(groupId, memberId);
      setGroup(data.group);
      onUpdated?.(data.group);
    } catch (err) {
      setError(err.message || "Failed to remove member");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Leave this group?")) return;
    setBusy(true);
    try {
      await groupsApi.leave(groupId);
      onLeft?.(groupId);
    } catch (err) {
      setError(err.message || "Failed to leave");
      setBusy(false);
    }
  };

  const startEditName = () => {
    setNameDraft(group?.name || "");
    setEditingName(true);
    setError("");
  };

  const cancelEditName = () => {
    setEditingName(false);
    setNameDraft("");
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setError("Group name is required");
      return;
    }
    if (trimmed === group.name) {
      setEditingName(false);
      return;
    }

    setBusy(true);
    setError("");
    try {
      const data = await groupsApi.update(groupId, { name: trimmed });
      setGroup(data.group);
      onUpdated?.(data.group);
      setEditingName(false);
    } catch (err) {
      setError(err.message || "Failed to update group name");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-8 w-8 rounded-full border-4 border-sky-200 dark:border-slate-600 border-t-sky-500 animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6 text-center text-slate-500">
        {error || "Group not found"}
        <div className="mt-4">
          <button type="button" className="btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-sky-100 dark:border-slate-700">
        <h2 className="font-semibold text-sky-800 dark:text-sky-400">Group info</h2>
        <button type="button" onClick={onClose} className="btn-ghost text-sm py-1">
          Close
        </button>
      </div>

      <div className="p-6 text-center border-b border-sky-50 dark:border-slate-700">
        <Avatar name={group.name} image={group.image} size="lg" />

        {editingName ? (
          <div className="mt-3 space-y-2 text-left">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Group name
            </label>
            <input
              className="input-field"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              maxLength={60}
              autoFocus
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
                if (e.key === "Escape") cancelEditName();
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-primary flex-1 text-sm py-2"
                disabled={busy}
                onClick={handleSaveName}
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn-ghost flex-1 text-sm py-2"
                disabled={busy}
                onClick={cancelEditName}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <div className="flex items-center justify-center gap-2">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{group.name}</h3>
              {isAdmin && (
                <button
                  type="button"
                  onClick={startEditName}
                  className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
                  title="Edit group name"
                >
                  Edit
                </button>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {group.members?.length || 0} members
            </p>
            <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">
              Admin: {group.admin?.name || "—"}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mx-4 mt-3 text-sm error-box">{error}</p>
      )}

      {isAdmin && (
        <div className="px-4 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Add member
          </p>
          {!hasChaudhry && (
            <button
              type="button"
              disabled={busy}
              onClick={handleAddChaudhry}
              className="w-full mb-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 py-2.5 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
            >
              Add Chaudhry AI · tag @ai in chat
            </button>
          )}
          {hasChaudhry && (
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400 rounded-lg bg-sky-50 dark:bg-slate-800 px-3 py-2">
              Chaudhry AI is in this group — type <span className="font-semibold text-sky-600 dark:text-sky-400">@ai</span> to talk.
            </p>
          )}
          <input
            className="input-field mb-2"
            placeholder="Search users to add…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="space-y-1 max-h-32 overflow-y-auto custom-scroll mb-2">
            {searchResults.map((u) => (
              <li
                key={u._id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-sky-50 dark:hover:bg-slate-800"
              >
                <Avatar name={u.name} image={u.avatar} size="sm" />
                <span className="flex-1 text-sm truncate">{u.name}</span>
                <button
                  type="button"
                  className="btn-primary text-xs py-1 px-2"
                  disabled={busy}
                  onClick={() => handleAdd(u._id)}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isAdmin && hasChaudhry && (
        <p className="mx-4 mt-3 text-xs text-slate-500 dark:text-slate-400 rounded-lg bg-sky-50 dark:bg-slate-800 px-3 py-2">
          Chaudhry AI is here — type <span className="font-semibold text-sky-600 dark:text-sky-400">@ai</span> to talk.
        </p>
      )}

      <div className="flex-1 overflow-y-auto custom-scroll px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Members
        </p>
        <ul className="space-y-1">
          {(group.members || []).map((m) => (
            <li
              key={m._id}
              className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-sky-50 dark:hover:bg-slate-800"
            >
              <Avatar name={m.name} image={m.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {m.name}
                  {m._id === currentUser?._id ? " (you)" : ""}
                </p>
                <p className="text-xs text-slate-500">@{m.username}</p>
              </div>
              {(m.isBot || m.username === "chaudhry_ai") && (
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded">
                  Bot
                </span>
              )}
              {group.admin?._id === m._id && (
                <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-slate-700 px-2 py-0.5 rounded">
                  Admin
                </span>
              )}
              {isAdmin && m._id !== group.admin?._id && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleRemove(m._id)}
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="p-4 border-t border-sky-100 dark:border-slate-700">
        <button
          type="button"
          onClick={handleLeave}
          disabled={busy}
          className="w-full rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 py-2.5 font-medium transition"
        >
          Leave group
        </button>
      </div>
    </div>
  );
}
