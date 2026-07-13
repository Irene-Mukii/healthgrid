/** @type {import('next').NextConfig} */
const nextConfig = {
  // We use the App Router exclusively — no Pages Router.
  // experimental.appDir is enabled by default in Next.js 14.

  // ARCHITECTURE DECISION: We do NOT use Next.js API routes for the backend.
  // All business logic lives in the Python/FastAPI backend. Next.js is purely
  // a frontend rendering layer. This keeps the two projects clearly separated
  // and means the backend can be called directly from mobile apps or other
  // clients in the future without going through Next.js.
  // TODO(v2): If we add server-side auth (NextAuth), some API routes may appear here.
};

module.exports = nextConfig;
