// types/chat.ts — TypeScript type definitions for all chat-related data.
//
// Centralizing types here means components never define their own inline types.
// If the backend changes its response shape, we update it in one place.

/**
 * A single chat message as stored in the frontend messages array.
 *
 * 'role' mirrors the Anthropic/Supabase convention: "user" | "assistant".
 * We don't expose the full backend Message shape (which includes id, created_at)
 * because the frontend only needs role + content for rendering.
 */
export type Role = "user" | "assistant";

export interface Message {
  id: string; // client-generated for React key prop (crypto.randomUUID())
  role: Role;
  content: string;
  /**
   * True while the assistant is still streaming this message.
   * We use this to show the blinking cursor and "Priya is typing..." indicator.
   * Once streaming is done, this is set to false (or the field is omitted).
   */
  isStreaming?: boolean;
}

/**
 * The shape of state that tracks a full conversation.
 * Today we only have one conversation ("conv-001"), but this type makes it
 * easy to support multiple conversations (tabs, sidebar) in v2.
 */
export interface ConversationState {
  conversationId: string;
  messages: Message[];
  /**
   * True when we're waiting for the first token from the backend.
   * Distinct from message.isStreaming — isLoading covers the latency
   * between "user hit send" and "first token arrived."
   */
  isLoading: boolean;
}
