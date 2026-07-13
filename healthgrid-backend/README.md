# HealthGrid Backend

FastAPI server that powers Priya — HealthGrid's AI healthcare operations analyst.

## Prerequisites

- Python 3.11+
- A Supabase project (free tier is fine)
- An Anthropic API key

## Setup

### 1. Clone and enter the backend directory
```bash
cd healthgrid-backend
```

### 2. Create a virtual environment
```bash
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
```bash
cp .env.example .env
# Open .env and fill in your keys
```

### 5. Set up the Supabase table
Open your Supabase project → SQL Editor and run:

```sql
CREATE TABLE messages (
    id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id text NOT NULL,
    role            text NOT NULL CHECK (role IN ('user', 'assistant')),
    content         text NOT NULL,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX ON messages(conversation_id, created_at);
```

### 6. Start the server
```bash
python main.py
# Server runs at http://localhost:8000
# API docs at  http://localhost:8000/docs
```

## API

### `POST /api/chat`

Stream a response from Priya.

**Request body:**
```json
{
  "conversation_id": "conv-001",
  "message": "What are our biggest ICU cost drivers?"
}
```

**Response:** `text/event-stream` (SSE)

Each event is a JSON payload on a `data:` line:
```
data: {"type": "delta", "content": "Based on"}
data: {"type": "delta", "content": " your question..."}
data: {"type": "done"}
```

Error events:
```
data: {"type": "error", "message": "Anthropic API error: ..."}
```

### `GET /health`

Liveness probe. Returns `{"status": "ok"}`.

## Project Structure

```
healthgrid-backend/
├── main.py           # App entry point — CORS, router registration
├── requirements.txt
├── .env.example      # Copy to .env, fill in secrets
├── agents/
│   └── priya.py      # Priya's system prompt + message builder
├── routes/
│   └── chat.py       # POST /api/chat with SSE streaming
├── db/
│   └── messages.py   # Supabase read/write functions
└── models/
    └── schemas.py    # Pydantic request/response models
```

## Architecture Notes

See `ARCHITECTURE.md` in the project root for how the backend and frontend connect.
