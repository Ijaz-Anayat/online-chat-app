"use client";

import { useEffect, useState } from "react";
import { usersApi, contactsApi } from "@/lib/api";
import Avatar from "./Avatar";

/**
 * Search users by name/username and add as contacts
 */
export default function FindPeople({ onContactAdded, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const data = await usersApi.search(query.trim());
        setResults(data.users || []);
      } catch (err) {
        setError(err.message || "Search failed");
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleAdd = async (userId) => {
    setAdding(userId);
    setError("");
    try {
      const data = await contactsApi.add(userId);
      setResults((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isContact: true } : u))
      );
      onContactAdded?.(data.contact);
    } catch (err) {
      setError(err.message || "Could not add contact");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-sky-100 dark:border-slate-700">
        <h2 className="font-semibold text-sky-800 dark:text-sky-400">Find People</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="btn-ghost text-sm py-1">
            Close
          </button>
        )}
      </div>

      <div className="p-4">
        <input
          className="input-field"
          placeholder="Search by name or username…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {error && (
        <p className="mx-4 mb-2 text-sm error-box">{error}</p>
      )}

      <div className="flex-1 overflow-y-auto custom-scroll px-2 pb-4">
        {loading && (
          <p className="text-center text-slate-400 text-sm py-6">Searching…</p>
        )}

        {!loading && query.trim() && results.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-6">No users found</p>
        )}

        {!loading && !query.trim() && (
          <p className="text-center text-slate-400 text-sm py-6">
            Type a name or username to find people
          </p>
        )}

        <ul className="space-y-1">
          {results.map((u) => (
            <li
              key={u._id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-sky-50 dark:hover:bg-slate-800 transition"
            >
              <Avatar name={u.name} image={u.avatar} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 dark:text-slate-100 truncate">{u.name}</p>
                <p className="text-xs text-slate-500 truncate">@{u.username}</p>
              </div>
              {u.isContact ? (
                <span className="text-xs text-sky-600 dark:text-sky-400 font-medium bg-sky-50 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                  Added
                </span>
              ) : (
                <button
                  type="button"
                  className="btn-primary text-sm py-1.5 px-3"
                  disabled={adding === u._id}
                  onClick={() => handleAdd(u._id)}
                >
                  {adding === u._id ? "…" : "Add"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
