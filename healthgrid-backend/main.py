"""
main.py — FastAPI application entry point for HealthGrid backend.

This file does three things:
  1. Creates the FastAPI app instance with metadata (used by /docs)
  2. Configures CORS so the Next.js frontend (localhost:3000) can call the API
  3. Registers all route modules

Keep this file minimal. Business logic lives in routes/, agents/, and db/.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env file before anything else. This must happen before any module that
# reads os.environ is imported, which is why it's at the top of main.py rather
# than inside a function.
load_dotenv()

from routes.chat import router as chat_router  # noqa: E402 — intentional late import

app = FastAPI(
    title="HealthGrid API",
    description="AI-powered healthcare operations platform. Day 1 backend.",
    version="0.1.0",
)

# ─────────────────────────────────────────────────────────────────────────────
# CORS Configuration
#
# ARCHITECTURE DECISION: We allow localhost:3000 explicitly for local development.
# In production, this list must be replaced with the actual frontend domain.
# Using allow_origins=["*"] is tempting but dangerous — it would allow any website
# to call this API on behalf of a logged-in user (CSRF-style attacks).
# # TODO(v2): Read allowed origins from environment variable for prod deployment.
# ─────────────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the chat router under the /api prefix.
# All routes in routes/chat.py will be accessible at /api/<route>.
app.include_router(chat_router, prefix="/api")


@app.get("/health")
async def health_check():
    """
    Simple liveness probe. Returns 200 OK if the server is running.
    Useful for Cloud Run health checks and local sanity testing.
    """
    return {"status": "ok", "service": "healthgrid-backend"}


if __name__ == "__main__":
    import uvicorn

    # Read port from environment so Cloud Run can inject its own port.
    # Cloud Run sets the PORT env var automatically.
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
