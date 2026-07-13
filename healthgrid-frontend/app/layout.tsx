// app/layout.tsx — Root layout for the Next.js App Router.
//
// This wraps every page in the app. It sets global HTML structure, font, and
// default metadata. Keep this minimal — page-specific metadata goes in each page.

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Inter: clean, readable sans-serif for UI chrome (labels, headings, buttons)
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// JetBrains Mono: monospace font for message content.
// Using a proper monospace (not system mono) gives the terminal/analyst feel
// without looking like a developer toy.
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HealthGrid",
  description:
    "AI-powered enterprise simulation platform for healthcare operations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="bg-slate-950 text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
