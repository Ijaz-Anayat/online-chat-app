# SkyChat — Full-stack Chat (Next.js + MongoDB Atlas)

WhatsApp-style chat: auth, contacts, 1-on-1 + group messaging, soft delete, dark mode.

## Stack (Vercel-ready)

- **Next.js 14** — App Router, API routes (backend built-in)
- **MongoDB Atlas** — Mongoose ODM
- **Auth** — JWT + bcrypt (httpOnly cookie)
- **Updates** — polling every 3s (no Socket.io — works on Vercel free tier)

> The `/backend` folder is the old Express + Socket.io server. You can ignore it or use it later when you split backend again.

## Folder structure

```
online-chat-app/
├── frontend/              # Deploy this to Vercel
│   ├── app/api/           # All API routes (auth, chat, groups…)
│   ├── lib/models/        # Mongoose schemas
│   └── ...
└── backend/               # Legacy Express server (optional)
```

## Local setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/online-chat-app?retryWrites=true&w=majority
JWT_SECRET=your_strong_secret_here
```

```bash
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

1. Push repo to GitHub
2. Import project on [Vercel](https://vercel.com) — **Root Directory: `frontend`**
3. Add environment variables:
   - `MONGODB_URI` — your Atlas connection string
   - `JWT_SECRET` — long random secret string
4. Deploy

No Render/Railway needed for the current setup.

## Features

- Signup / login / logout
- Find people, add contacts
- 1-on-1 and group chat (polling-based refresh)
- Group admin: add/remove members, leave
- Soft delete messages (“Delete for me”)
- Light + dark theme toggle

## API routes (same domain)

All live under `/api/...` inside the Next.js app — see `frontend/app/api/`.

## Later: separate backend again

When you want true real-time (Socket.io), extract `app/api` logic back to `/backend` and point `NEXT_PUBLIC_API_URL` at Render/Railway.
