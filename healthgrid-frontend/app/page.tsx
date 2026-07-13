// app/page.tsx — Root page. Redirects to /chat immediately.
//
// Today we only have one page (/chat). The root redirect means typing
// localhost:3000 in the browser takes you straight to the chat.
// In v2, this will become a landing page / dashboard once auth is added.
// TODO(v2): Replace redirect with a proper dashboard or marketing landing page.

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/chat");
}
