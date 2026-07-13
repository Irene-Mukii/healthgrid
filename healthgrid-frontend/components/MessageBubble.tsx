// components/MessageBubble.tsx — Renders a single chat message.
//
// Kept deliberately simple: dark bubble for assistant, lighter bubble for user.
// The only "smart" thing it does is render a blinking cursor while streaming.

import { Message } from "@/types/chat";

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={`flex w-full ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      <div
        className={`
          relative max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
          font-mono whitespace-pre-wrap break-words
          ${
            isAssistant
              ? "bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700"
              : "bg-indigo-600 text-white rounded-tr-sm"
          }
        `}
      >
        {/* Sender label — only show for assistant messages */}
        {isAssistant && (
          <span className="block text-xs font-sans font-semibold text-indigo-400 mb-1 tracking-wide uppercase">
            Priya
          </span>
        )}

        {/* Message content */}
        <span>{message.content}</span>

        {/* Blinking cursor shown while this message is still streaming */}
        {message.isStreaming && (
          <span
            className="inline-block w-[2px] h-[14px] ml-0.5 bg-indigo-400 align-middle animate-pulse"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}
