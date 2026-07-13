# HealthGrid — Architecture Overview

> Plain-English explanation of how the two projects connect. Written for anyone joining the project cold.

## The Two Projects

```
HealthGrid/
├── healthgrid-backend/   # Python / FastAPI
└── healthgrid-frontend/  # Next.js 14 / TypeScript
```

These are two completely separate applications. They talk to each other over HTTP. That's the only connection between them.

---

## Request Flow: What Happens When a User Sends a Message

```
Browser (localhost:3000)
  │
  │  POST /api/chat
  │  { conversation_id: "conv-001", message: "What are our ICU cost drivers?" }
  │
  ▼
FastAPI Backend (localhost:8000)
  │
  ├─► Supabase           → fetch conversation history (prior messages)
  │
  ├─► Build messages[]   → [history...] + new user message
  │
  ├─► Anthropic Claude   → stream tokens back
  │
  ├─► SSE stream         → yield each token to the browser as it arrives
  │
  └─► Supabase           → save user message + complete assistant response
  │
  ▼
Browser
  └─► React state        → update message bubble token-by-token
```

---

## Why SSE Instead of WebSockets?

Server-Sent Events (SSE) are one-directional: the server pushes data to the client. That's exactly what token streaming requires — Claude generates tokens, we push them to the browser.

WebSockets are bidirectional — both sides can send messages at any time. That's the right tool when you need the client to also push data back in real time (e.g., audio chunks from a microphone in a voice agent).

Using WebSockets for token streaming would add complexity (connection management, heartbeats, reconnect logic) for no benefit. SSE works over standard HTTP, has native browser support (`EventSource` API), and is stateless — the server doesn't maintain a connection object.

> **TODO(v2/Phase 3):** When we add voice agents, we'll add WebSocket support alongside SSE. SSE will remain for text-based agents.

---

## Why a Separate Python Backend Instead of Next.js API Routes?

Three reasons:

1. **Anthropic SDK is more mature in Python.** The streaming API, tool use, and future features are first-class in Python.
2. **The backend will grow independently.** Future agents, database migrations, and ML components don't belong inside a Next.js app.
3. **Other clients can call the same backend.** A mobile app, a Slack bot, or a voice interface can all call `POST /api/chat` without any changes.

The frontend's only job is to render what the backend sends. It doesn't know anything about Claude or Supabase.

---

## Data Persistence (Supabase)

All conversation history is stored in a single `messages` table in Supabase (PostgreSQL):

| Column            | Type        | Purpose                                      |
|-------------------|-------------|----------------------------------------------|
| `id`              | uuid        | Primary key, auto-generated                  |
| `conversation_id` | text        | Groups messages into a thread                |
| `role`            | text        | `'user'` or `'assistant'`                    |
| `content`         | text        | The message text                             |
| `created_at`      | timestamptz | Used for ordering messages chronologically   |

The backend fetches history before every Anthropic call so Priya remembers the conversation. The frontend is stateless on reload — history lives in the database, not in the browser.

---

## The Agent: Priya

Priya is defined entirely in `healthgrid-backend/agents/priya.py`. She is:

- A system prompt (`PRIYA_SYSTEM_PROMPT`) that tells Claude who she is, what she knows, and how to respond.
- A `build_messages()` function that prepends history to the new user message.

**Priya does not have tool access today.** She answers from her training knowledge. In v2, she'll get Supabase query tools so she can analyze the hospital's actual data.

> **TODO(v2):** Add Anthropic tool use — give Priya direct database access.

---

## What's Hardcoded Today (And Why It's OK)

| Hardcoded value        | Location                         | Why OK today                                        | Change in v2                              |
|------------------------|----------------------------------|-----------------------------------------------------|-------------------------------------------|
| `conversation_id: "conv-001"` | `ChatWindow.tsx`        | No auth yet, only one session                       | Derive from authenticated user session    |
| `user_id: "dev-user-001"` | Implicit in DB schema         | No auth yet                                         | Replace with real user ID from auth token |
| `BACKEND_URL = "localhost:8000"` | `lib/api.ts`           | Local dev only                                      | `NEXT_PUBLIC_API_URL` env var             |
| Model: `claude-sonnet-4-5` | `routes/chat.py`             | Best balance of quality/speed/cost for Day 1        | Env var, configurable per agent           |

---

## Day 2+ Roadmap (Not Designed Yet — Just Flagged)

- **Auth:** Add Supabase Auth (email/password or Google OAuth). Session ID becomes the conversation ID.
- **Multiple Agents:** Compliance agent, financial modeling agent. Each gets its own file in `agents/`.
- **Tool Use:** Give Priya direct access to the Supabase database via Anthropic tool calls.
- **Voice Agents:** WebSocket-based audio streaming for real-time voice interaction (Phase 3).
- **Dashboard:** Replace the `/chat` redirect from root with a proper executive dashboard.
