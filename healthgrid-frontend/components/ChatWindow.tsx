"use client";
// components/ChatWindow.tsx — The main chat interface component.
//
// This is the "smart" component that owns all state. MessageBubble and MessageInput
// are "dumb" — they receive props and fire callbacks. Keeping state centralized here
// makes the data flow easy to follow and debug.
//
// "use client" is required because this component uses useState, useEffect, and
// event handlers — all of which are browser-only React features.

import { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { Message } from "@/types/chat";
import { streamChat } from "@/lib/api";

// ARCHITECTURE DECISION: conversation_id is hardcoded here for Day 1.
// In v2, this will come from the URL (e.g., /chat/[conversationId]) and be
// generated when a user starts a new session after authentication is added.
// TODO(v2): Derive conversationId from authenticated session / URL params.
const CONVERSATION_ID = "conv-001";

export default function ChatWindow() {
  // Tracks the list of messages displayed in the chat.
  // Each message has a client-generated id, role, content, and optional isStreaming flag.
  // We store the assistant's in-progress message here too, updating it token-by-token.
  const [messages, setMessages] = useState<Message[]>([]);

  // Tracks whether we're waiting for the FIRST token after the user sends a message.
  // This is separate from message.isStreaming — isLoading covers the gap between
  // "send clicked" and "first token arrived," during which no message bubble exists yet.
  const [isLoading, setIsLoading] = useState(false);

  // Ref to the bottom of the message list. We use this to auto-scroll to the latest
  // message. A ref (not state) is used because scrolling is a side effect, not a
  // render concern — we don't want a re-render when the ref changes.
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message whenever messages change.
  // We use a useEffect because DOM manipulation (scrolling) must happen after render,
  // not during it. Calling scrollIntoView inside the render function would fail.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Adds a greeting message from Priya when the component first mounts.
  // We use useEffect with an empty dependency array [] so it runs exactly once,
  // after the first render. This is the correct place for initialization logic
  // that should only run once — not inside the component body (which runs on
  // every render) and not in a useState initializer (which can't be async).
  useEffect(() => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Hello, I'm Priya — your HealthGrid operations analyst.\n\nI can help you analyze cost drivers, staffing patterns, capacity utilization, and more. What would you like to explore today?",
      },
    ]);
  }, []);

  async function handleSend(userMessage: string) {
    if (isLoading) return;

    // Add the user's message to the display immediately (optimistic UI).
    // We don't wait for the backend to confirm — the user should see their
    // message appear the moment they hit send.
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Create a placeholder for Priya's response with isStreaming=true.
    // We'll update this message's content token-by-token as the stream arrives.
    const assistantMsgId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
      },
    ]);

    // isLoading can now be set to false — the placeholder bubble is showing.
    // The "Priya is typing…" state transitions to the streaming cursor inside MessageBubble.
    setIsLoading(false);

    await streamChat(CONVERSATION_ID, userMessage, {
      onToken: (token: string) => {
        // Append each incoming token to the assistant message bubble.
        // We use the functional form of setMessages to avoid stale closure issues:
        // each call to setMessages gets the freshest state, not the value captured
        // when the callback was created.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: m.content + token }
              : m
          )
        );
      },
      onDone: () => {
        // Mark streaming as complete — removes the blinking cursor.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId ? { ...m, isStreaming: false } : m
          )
        );
      },
      onError: (errorMessage: string) => {
        // Replace the streaming placeholder with an error message.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `⚠️ Error: ${errorMessage}`,
                  isStreaming: false,
                }
              : m
          )
        );
      },
    });
  }

  // Determine if the input should be disabled.
  // We disable it when any message is still streaming — the user shouldn't be
  // able to send another message until Priya finishes responding.
  const isStreaming = messages.some((m) => m.isStreaming);
  const inputDisabled = isLoading || isStreaming;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm">
        {/* Status indicator dot */}
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
            P
          </div>
          {/* Green dot = Priya is online / not streaming */}
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${
              isStreaming ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
            }`}
          />
        </div>

        <div>
          <h1 className="text-slate-100 font-semibold text-sm">Priya</h1>
          <p className="text-slate-400 text-xs">
            {isStreaming
              ? "Priya is typing…"
              : "Healthcare Operations Analyst · HealthGrid AI"}
          </p>
        </div>
      </div>

      {/* ── Message List ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Invisible div at the bottom — scrolled into view on new messages */}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────────── */}
      <MessageInput onSend={handleSend} disabled={inputDisabled} />
    </div>
  );
}
