// app/chat/page.tsx — The main chat page at /chat.
//
// This is a Server Component by default (no "use client" directive).
// It just provides the page shell (metadata, layout) and mounts ChatWindow.
// ChatWindow itself is a Client Component that owns all the interactive state.
//
// ARCHITECTURE DECISION: Splitting page (server) from ChatWindow (client) is
// Next.js App Router best practice. Server Components can do data fetching,
// set metadata, and render layout without shipping any JS to the browser.
// Only the leaf components that need interactivity opt in to "use client."

import type { Metadata } from "next";
import ChatWindow from "@/components/ChatWindow";

export const metadata: Metadata = {
  title: "Chat with Priya · HealthGrid",
  description:
    "AI-powered healthcare operations analysis. Ask Priya about cost drivers, staffing, capacity, and more.",
};

export default function ChatPage() {
  return (
    // Full viewport height, dark background.
    // The outer div handles the page background; ChatWindow fills the inner space.
    <main className="flex h-screen bg-slate-950 text-slate-100">
      {/* ── Sidebar placeholder — will become agent nav in v2 ──────── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800 bg-slate-900 p-4 gap-4">
        {/* HealthGrid wordmark */}
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="w-4 h-4 text-white"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
          <span className="font-bold text-slate-100 tracking-tight text-lg">
            HealthGrid
          </span>
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-800" />

        {/* Active conversation indicator */}
        <div className="flex flex-col gap-1">
          <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold px-2 mb-1">
            Agents
          </p>
          <button
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-left"
            aria-current="page"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              P
            </div>
            <div>
              <p className="text-sm font-medium text-slate-100">Priya</p>
              <p className="text-xs text-slate-400 truncate">
                Operations Analyst
              </p>
            </div>
          </button>

          {/* TODO(v2): Add compliance agent, voice triage agent, etc. */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl opacity-30 cursor-not-allowed">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">
              +
            </div>
            <p className="text-sm text-slate-400">More agents coming</p>
          </div>
        </div>

        {/* Push version tag to bottom */}
        <div className="mt-auto">
          <p className="text-xs text-slate-600 px-2">HealthGrid v0.1.0-dev</p>
        </div>
      </aside>

      {/* ── Chat area ───────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">
        <ChatWindow />
      </div>
    </main>
  );
}
