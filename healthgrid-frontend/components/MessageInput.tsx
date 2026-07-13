// components/MessageInput.tsx — Text input and Send button.
//
// Handles keyboard shortcut (Enter to send) and disabled state during streaming.
// This is a "controlled component" — the parent owns the input value via props.

import { useState, KeyboardEvent } from "react";

interface MessageInputProps {
  /**
   * Called when the user submits a message (either Enter key or Send button).
   * The parent is responsible for clearing the input if it chooses.
   */
  onSend: (message: string) => void;
  /**
   * When true, the input and button are disabled.
   * This prevents the user from sending another message while Priya is responding.
   */
  disabled: boolean;
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  // Local state: the current value of the textarea.
  // We keep this local because the parent (ChatWindow) doesn't need to know
  // the draft text — it only cares about finalized messages.
  const [value, setValue] = useState("");

  function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue(""); // clear input after sending
  }

  // Allow Enter to submit, Shift+Enter for newline.
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault(); // prevent default newline insertion
      handleSend();
    }
  }

  return (
    <div className="flex items-end gap-3 p-4 border-t border-slate-700 bg-slate-900">
      <textarea
        id="message-input"
        className={`
          flex-1 resize-none rounded-xl bg-slate-800 border border-slate-700
          text-slate-100 font-mono text-sm px-4 py-3
          placeholder:text-slate-500 focus:outline-none focus:ring-2
          focus:ring-indigo-500 focus:border-transparent
          transition-all duration-150
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        rows={3}
        placeholder={
          disabled
            ? "Priya is thinking…"
            : "Ask Priya about operations, staffing, cost drivers… (Enter to send)"
        }
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-label="Message input"
      />

      <button
        id="send-button"
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className={`
          flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center
          font-semibold text-white transition-all duration-150
          ${
            disabled || !value.trim()
              ? "bg-slate-700 cursor-not-allowed opacity-50"
              : "bg-indigo-600 hover:bg-indigo-500 active:scale-95 shadow-lg shadow-indigo-500/20"
          }
        `}
        aria-label="Send message"
        title="Send (Enter)"
      >
        {/* Simple SVG arrow icon — no icon library needed */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
        >
          <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
      </button>
    </div>
  );
}
