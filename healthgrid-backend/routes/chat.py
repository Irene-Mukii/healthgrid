"""
routes/chat.py — POST /api/chat endpoint with SSE streaming.

ARCHITECTURE DECISION: We use Server-Sent Events (SSE) instead of WebSockets here
because SSE is simpler for one-directional streaming (server → client). The Anthropic
API streams tokens to us, and we forward them to the browser. That's a one-way flow.
SSE is natively supported by browsers without extra libraries (EventSource API) and
works over standard HTTP/1.1. WebSockets make sense when we need bidirectional
realtime communication — for example, Phase 3 voice agents where the client also
sends audio chunks back to the server.
# TODO(v2): Evaluate WebSockets for voice agent integration (Phase 3).
"""

import asyncio
import json
import os

import anthropic
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from agents.priya import PRIYA_SYSTEM_PROMPT, build_messages
from db.messages import get_conversation_history, save_message
from models.schemas import ChatRequest

router = APIRouter()

_anthropic = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

# The model we're using today. Claude 3.5 Sonnet is the best balance of speed,
# quality, and cost for a conversational enterprise product.
# TODO(v2): Make this configurable via environment variable so we can A/B test models.
_MODEL = "claude-sonnet-4-5"

# Max tokens Priya will generate per response. 1024 is enough for detailed analyses
# without running up excessive API costs during development.
# TODO(v2): Make this configurable per request type (quick Q&A vs. full report).
_MAX_TOKENS = 1024


@router.post("/chat")
async def chat(request: ChatRequest) -> StreamingResponse:
    """
    POST /api/chat

    Accepts a conversation_id and message, streams Priya's response back as SSE.

    Flow:
        1. Fetch conversation history from Supabase
        2. Build the messages array (history + new message)
        3. Save the user's message to Supabase
        4. Open a streaming request to Anthropic
        5. Yield SSE events as tokens arrive
        6. After the stream ends, save the full assistant response to Supabase

    Why async? See explanation in db/messages.py — the same reasoning applies here.
    Streaming an HTTP response is inherently async: we're yielding chunks over time
    rather than returning a single value. FastAPI's StreamingResponse works with
    async generators natively.
    """

    # Step 1: Fetch history. We need this before calling Anthropic so Priya has
    # context about what was already discussed in this conversation.
    history = await get_conversation_history(request.conversation_id)

    # Step 2: Build the messages array for the Anthropic API.
    messages = build_messages(history, request.message)

    # Step 3: Persist the user's message now, before we call Anthropic.
    # We save user messages eagerly so that if the Anthropic call fails, we still
    # have a record that the user sent this message (useful for debugging and retry).
    await save_message(request.conversation_id, "user", request.message)

    # Step 4 & 5: Stream the Anthropic response and yield SSE events.
    return StreamingResponse(
        _stream_priya_response(request.conversation_id, messages),
        media_type="text/event-stream",
        headers={
            # These headers are required for SSE to work correctly across proxies
            # and browsers. Cache-Control prevents intermediaries from buffering
            # the stream. X-Accel-Buffering disables nginx buffering if used.
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


async def _stream_priya_response(conversation_id: str, messages: list[dict]):
    """
    Async generator that:
      - Calls Anthropic with streaming enabled
      - Yields SSE-formatted events for each text delta
      - Collects the full response text
      - Saves the complete assistant response to Supabase when done

    SSE event format (what the browser EventSource API parses):
        data: {"type": "delta", "content": "token text here"}\n\n
        data: {"type": "done"}\n\n

    The double newline (\n\n) is required by the SSE spec to delimit events.
    Each `data:` line carries a JSON payload so the frontend can handle different
    event types (streaming delta vs. end signal vs. future error events).
    """
    full_response = []  # collect tokens to save the complete response at the end

    try:
        # ARCHITECTURE DECISION: We use the AsyncAnthropic client's stream context
        # manager (`async with`) and async iterator (`async for`) to handle the HTTP stream
        # in a fully non-blocking manner. The event loop is yielded automatically
        # by the async iterator, so manual yielding via asyncio.sleep(0) is no longer needed.
        async with _anthropic.messages.stream(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            system=PRIYA_SYSTEM_PROMPT,
            messages=messages,
        ) as stream:
            async for text_chunk in stream.text_stream:
                # Accumulate tokens for the final DB save
                full_response.append(text_chunk)

                # Yield an SSE event. json.dumps() ensures special characters
                # (newlines, quotes) inside the token are safely escaped.
                payload = json.dumps({"type": "delta", "content": text_chunk})
                yield f"data: {payload}\n\n"

        # Step 6: Stream is complete. Save the full assistant response.
        complete_response = "".join(full_response)
        await save_message(conversation_id, "assistant", complete_response)

        # Signal to the frontend that the stream has ended.
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except anthropic.APIError as e:
        # Surface API errors as an SSE error event so the frontend can show
        # a user-friendly message rather than just hanging.
        error_payload = json.dumps(
            {"type": "error", "message": f"Anthropic API error: {str(e)}"}
        )
        yield f"data: {error_payload}\n\n"
    except Exception as e:
        # Catch-all for unexpected errors. In production we'd log to a structured
        # logging system here.
        # TODO(v2): Add structured logging (e.g., structlog or Google Cloud Logging).
        error_payload = json.dumps(
            {"type": "error", "message": "An unexpected error occurred."}
        )
        yield f"data: {error_payload}\n\n"
