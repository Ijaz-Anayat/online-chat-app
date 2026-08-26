"use client";

import { useState } from "react";
import { groupsApi } from "@/lib/api";
import Avatar from "./Avatar";

/**
 * Create a group: name, optional image URL, pick members from contacts
 */
export default function CreateGroup({ contacts, onCreated, onClose }) {
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggle = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const data = await groupsApi.create({
        name: name.trim(),
        image: image.trim(),
        memberIds: selected,
      });
      onCreated?.(data.group);
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to create group");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-sky-100">
        <h2 className="font-semibold text-sky-800">New Group</h2>
        {onClose && (
          <button type="button" onClick={onClose} className="btn-ghost text-sm py-1">
            Close
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className="p-4 space-y-3 border-b border-sky-50">
          {error && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}
          <input
            className="input-field"
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="input-field"
            placeholder="Image URL (optional)"
            value={image}
            onChange={(e) => setImage(e.target.value)}
          />
        </div>

        <p className="px-4 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Add members from contacts
        </p>

        <div className="flex-1 overflow-y-auto custom-scroll px-2 py-2">
          {contacts.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-6">
              No contacts yet — find people first
            </p>
          )}
          <ul className="space-y-1">
            {contacts.map((c) => {
              const checked = selected.includes(c._id);
              return (
                <li key={c._id}>
                  <button
                    type="button"
                    onClick={() => toggle(c._id)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                      checked ? "bg-sky-100" : "hover:bg-sky-50"
                    }`}
                  >
                    <Avatar name={c.name} image={c.avatar} />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-slate-800 truncate">{c.name}</p>
                      <p className="text-xs text-slate-500">@{c.username}</p>
                    </div>
                    <span
                      className={`h-5 w-5 rounded-md border-2 flex items-center justify-center text-xs ${
                        checked
                          ? "bg-sky-500 border-sky-500 text-white"
                          : "border-sky-200"
                      }`}
                    >
                      {checked ? "✓" : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-4 border-t border-sky-100">
          <button type="submit" className="btn-primary w-full" disabled={submitting}>
            {submitting ? "Creating…" : `Create group${selected.length ? ` (${selected.length})` : ""}`}
          </button>
        </div>
      </form>
    </div>
  );
}
