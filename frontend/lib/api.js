/**
 * Same-origin API — works locally and on Vercel (no separate backend URL needed).
 */
async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const error = new Error(data?.message || "Request failed");
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const authApi = {
  signup: (body) => api("/api/auth/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => api("/api/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => api("/api/auth/logout", { method: "POST" }),
  me: () => api("/api/auth/me"),
};

export const usersApi = {
  search: (query) => api(`/api/users/search?query=${encodeURIComponent(query)}`),
};

export const contactsApi = {
  list: () => api("/api/contacts"),
  add: (contactId) =>
    api("/api/contacts/add", { method: "POST", body: JSON.stringify({ contactId }) }),
};

export const groupsApi = {
  list: () => api("/api/groups"),
  get: (id) => api(`/api/groups/${id}`),
  create: (body) => api("/api/groups/create", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) =>
    api(`/api/groups/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  addMember: (id, memberId) =>
    api(`/api/groups/${id}/add-member`, {
      method: "POST",
      body: JSON.stringify({ memberId }),
    }),
  removeMember: (id, memberId) =>
    api(`/api/groups/${id}/remove-member`, {
      method: "POST",
      body: JSON.stringify({ memberId }),
    }),
  leave: (id) => api(`/api/groups/${id}/leave`, { method: "POST" }),
};

export const messagesApi = {
  get: (chatId, type = "dm") =>
    api(`/api/messages/${chatId}?type=${type === "group" ? "group" : "dm"}`),
  send: (body) => api("/api/messages/send", { method: "POST", body: JSON.stringify(body) }),
  softDelete: (id) => api(`/api/messages/${id}/delete`, { method: "PATCH" }),
  markRead: (chatId, type = "dm") =>
    api("/api/messages/read", {
      method: "POST",
      body: JSON.stringify({ chatId, type: type === "group" ? "group" : "dm" }),
    }),
};
