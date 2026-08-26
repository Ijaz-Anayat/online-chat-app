# SkyChat — Full-stack Real-time Chat (MERN)

A WhatsApp-style chat app with authentication, contacts, one-on-one messaging, groups, and soft-delete messages.

## Stack

- **Frontend:** Next.js (App Router), JavaScript, Tailwind CSS, Socket.io client
- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, JWT + bcrypt

## Folder structure

```
online-chat-app/
├── backend/          # Express API + Socket.io
└── frontend/         # Next.js app
```

## Prerequisites

- Node.js 18+
- **MongoDB** — install [MongoDB Community](https://www.mongodb.com/try/download/community) or set an Atlas URI in `backend/.env` as `MONGODB_URI`
- If local Mongo is missing, the backend tries an in-memory server (needs [VC++ Redistributable](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) on Windows)

## Setup

### 1. Backend

```bash
cd backend
npm install
```

Edit `backend/.env` if needed:

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/online-chat-app
JWT_SECRET=chat_app_super_secret_jwt_key_change_in_production
CLIENT_URL=http://localhost:3000
```

Start the API:

```bash
npm run dev
```

Server: http://localhost:5000

> Tip: set `USE_MEMORY_DB=true` in `.env` to skip connecting to local MongoDB and always use the in-memory database.

### 2. Frontend

```bash
cd frontend
npm install
```

`frontend/.env.local` should contain:

```
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

Start Next.js:

```bash
npm run dev
```

App: http://localhost:3000

## Features

1. **Auth** — signup / login, bcrypt passwords, JWT in httpOnly cookie, protected `/chat`
2. **Find People** — search by name/username, add contacts (no duplicates)
3. **1-on-1 chat** — real-time via Socket.io, last-message previews
4. **Groups** — create, add/remove members (admin), leave, real-time updates
5. **Soft delete** — “Delete for me” sets `deletedFor` (document stays in MongoDB)

## API overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/users/search?query=` | Search users |
| POST | `/api/contacts/add` | Add contact |
| GET | `/api/contacts` | List contacts |
| POST | `/api/groups/create` | Create group |
| GET | `/api/groups` | List groups |
| POST | `/api/groups/:id/add-member` | Add member |
| POST | `/api/groups/:id/remove-member` | Remove member |
| POST | `/api/groups/:id/leave` | Leave group |
| GET | `/api/messages/:chatId` | Get messages (`?type=group`) |
| POST | `/api/messages/send` | Send message |
| PATCH | `/api/messages/:id/delete` | Soft delete |

## Theme

Sky-blue UI (`sky-500` accents), light backgrounds, rounded bubbles, responsive sidebar + chat layout.
