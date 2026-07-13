# HealthGrid Frontend

Next.js 14 frontend for the HealthGrid AI healthcare operations platform. Provides the chat UI for interacting with Priya.

## Prerequisites

- Node.js 18+
- npm or yarn
- The `healthgrid-backend` server running on `localhost:8000`

## Setup

### 1. Enter the frontend directory
```bash
cd healthgrid-frontend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the development server
```bash
npm run dev
# App runs at http://localhost:3000
# Navigating to / automatically redirects to /chat
```

Make sure the backend is running first (`python main.py` in `healthgrid-backend/`).

## Project Structure

```
healthgrid-frontend/
├── app/
│   ├── layout.tsx        # Root layout — fonts, global styles, metadata
│   ├── globals.css       # Tailwind base + custom scrollbar
│   ├── page.tsx          # Root redirect → /chat
│   └── chat/
│       └── page.tsx      # Main chat page with sidebar layout
├── components/
│   ├── ChatWindow.tsx    # Smart component: owns all state, orchestrates streaming
│   ├── MessageInput.tsx  # Controlled textarea + send button
│   └── MessageBubble.tsx # Single message renderer (user & assistant)
├── lib/
│   └── api.ts            # streamChat() — Fetch API + manual SSE parsing
├── types/
│   └── chat.ts           # Message, Role, ConversationState types
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.js
```

## How Streaming Works

1. User types a message and hits Enter (or Send button)
2. `ChatWindow` calls `streamChat()` from `lib/api.ts`
3. `streamChat()` opens a `fetch()` POST to `http://localhost:8000/api/chat`
4. The backend immediately starts streaming Server-Sent Events
5. Each `data: {"type":"delta","content":"..."}` event is parsed from the response body
6. The assistant message bubble updates token-by-token via React state
7. `data: {"type":"done"}` signals the stream is complete; the blinking cursor disappears

## Architecture Notes

See `ARCHITECTURE.md` in the project root for how the frontend and backend connect.
