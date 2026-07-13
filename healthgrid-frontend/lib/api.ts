// lib/api.ts — Functions for communicating with the HealthGrid backend.
//
// ARCHITECTURE DECISION: All backend calls are funnelled through this file.
// Components never call fetch() directly. This makes it easy to:
//   - Change the base URL for staging/production deployments
//   - Add auth headers in v2 without touching every component
//   - Mock the API in tests
//
// TODO(v2): Read BACKEND_URL from an environment variable (NEXT_PUBLIC_API_URL)
// so the frontend can point at staging or production backends without code changes.

const BACKEND_URL = "http://localhost:8000";

/**
 * Callbacks passed to streamChat() so the caller can react to each SSE event.
 * Using callbacks (instead of returning an async iterator) keeps the API simple
 * for React components that just want to update state.
 */
export interface StreamCallbacks {
  onToken: (token: string) => void; // called for each text chunk as it arrives
  onDone: () => void; // called when the stream completes successfully
  onError: (message: string) => void; // called if the backend sends an error event
}

/**
 * streamChat — Call POST /api/chat and stream Priya's response via SSE.
 *
 * We use the Fetch API + ReadableStream rather than the browser's EventSource
 * because EventSource only supports GET requests and doesn't allow a request body.
 * Our chat endpoint is POST (with a JSON body), so we read the SSE stream manually
 * using a TextDecoder on the response body's ReadableStream.
 *
 * SSE line format (from the backend):
 *   data: {"type": "delta", "content": "token text"}\n\n
 *   data: {"type": "done"}\n\n
 *   data: {"type": "error", "message": "..."}\n\n
 */
export async function streamChat(
  conversationId: string,
  message: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId, message }),
  });

  if (!response.ok) {
    callbacks.onError(`Backend returned HTTP ${response.status}`);
    return;
  }

  // response.body is a ReadableStream<Uint8Array>. We wrap it with a reader
  // and decode chunks into text using TextDecoder.
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = ""; // SSE events can be split across multiple chunks

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    // Decode the binary chunk to a string and append to our running buffer.
    buffer += decoder.decode(value, { stream: true });

    // SSE events are separated by double newlines (\n\n). Split on that.
    const lines = buffer.split("\n\n");

    // The last element after splitting may be an incomplete event (the rest
    // is in the next chunk). Keep it in the buffer for the next iteration.
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      // Each complete SSE event looks like: "data: {...json...}"
      // We strip the "data: " prefix to get the raw JSON.
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const jsonStr = trimmed.slice("data: ".length);
      try {
        const event = JSON.parse(jsonStr) as {
          type: "delta" | "done" | "error";
          content?: string;
          message?: string;
        };

        if (event.type === "delta" && event.content) {
          callbacks.onToken(event.content);
        } else if (event.type === "done") {
          callbacks.onDone();
          return;
        } else if (event.type === "error") {
          callbacks.onError(event.message ?? "Unknown error");
          return;
        }
      } catch {
        // Malformed JSON in an SSE event. Log and continue — don't crash.
        console.warn("[HealthGrid] Could not parse SSE event:", jsonStr);
      }
    }
  }

  // If the stream ended without a "done" event (e.g., connection dropped),
  // still call onDone so the UI doesn't stay in a loading state forever.
  callbacks.onDone();
}
