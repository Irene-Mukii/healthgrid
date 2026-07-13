"""
db/messages.py — Supabase persistence layer for conversation messages.

──────────────────────────────────────────────────────────────────────────────
SUPABASE TABLE SETUP (run this SQL in your Supabase SQL Editor before starting):
──────────────────────────────────────────────────────────────────────────────

    CREATE TABLE messages (
        id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        conversation_id text NOT NULL,
        role            text NOT NULL CHECK (role IN ('user', 'assistant')),
        content         text NOT NULL,
        created_at      timestamptz DEFAULT now()
    );

    -- This composite index makes fetching a conversation's history fast even
    -- as the messages table grows to millions of rows. Without it, Supabase
    -- would do a full table scan for every /chat request.
    CREATE INDEX ON messages(conversation_id, created_at);

──────────────────────────────────────────────────────────────────────────────

Data shape note:
    Anthropic's messages API expects a list like:
        [
          {"role": "user",      "content": "Hello"},
          {"role": "assistant", "content": "Hi there!"},
          {"role": "user",      "content": "Tell me more..."},
        ]

    The 'role' field must alternate and can only be 'user' or 'assistant'.
    We enforce this at the database level with the CHECK constraint above.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# ARCHITECTURE DECISION: We create the Supabase client once at module import time
# (module-level singleton) rather than inside each function. This avoids the
# overhead of re-creating the HTTP client on every request. In a high-traffic
# production system we would use connection pooling (e.g., PgBouncer via Supabase
# connection strings), but that's unnecessary complexity for Day 1.
# TODO(v2): Add connection pooling when concurrent users exceed ~50.
_supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_ANON_KEY"],
)


async def get_conversation_history(conversation_id: str) -> list[dict]:
    """
    Fetch all messages for a given conversation, ordered oldest-first.

    Returns a list of dicts shaped for the Anthropic API:
        [{"role": "user" | "assistant", "content": "<text>"}]

    We order by created_at ASC so the messages appear in chronological order,
    which is the order the Anthropic API requires. Returning them newest-first
    would cause the model to misread the conversation flow.

    Why async? FastAPI runs on an async event loop (via uvicorn + anyio). If we
    call blocking I/O (like a database query) synchronously, we block the entire
    event loop and no other requests can be handled until the query completes.
    Marking this async allows uvicorn to suspend this coroutine while the DB
    responds and serve other requests in the meantime.

    NOTE: The supabase-py v2 client's `.execute()` is currently synchronous under
    the hood — it uses httpx in sync mode. For Day 1 this is fine. The `async`
    keyword here signals intent and allows us to switch to the async supabase
    client (or asyncpg) in v2 without changing any of the call sites.
    # TODO(v2): Replace with true async supabase client (supabase-py asyncio support).
    """
    response = (
        _supabase.table("messages")
        .select("role, content")
        .eq("conversation_id", conversation_id)
        .order("created_at", desc=False)
        .execute()
    )

    # response.data is a list of row dicts. We only return role + content
    # because that's all the Anthropic API cares about (it doesn't need our
    # internal id or created_at timestamps).
    return [{"role": row["role"], "content": row["content"]} for row in response.data]


async def save_message(conversation_id: str, role: str, content: str) -> None:
    """
    Persist a single message to Supabase.

    We call this twice per /chat request:
      1. After receiving the user's message (role='user')
      2. After the assistant finishes streaming its full response (role='assistant')

    We save AFTER streaming completes (not before) for the assistant message
    because SSE streams the response token-by-token. We don't have the full
    content until the stream is done. Saving a partial response would corrupt
    the conversation history.

    # TODO(v2): Consider saving the assistant message incrementally with a
    # 'pending' status to support resuming interrupted streams.
    """
    _supabase.table("messages").insert(
        {
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
        }
    ).execute()
