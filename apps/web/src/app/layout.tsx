import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import type { Metadata } from "next";

import { loadEnv } from "@/env";
import { themeScript } from "@/lib/theme";

import "./globals.css";

const env = loadEnv();

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: "Loopnote",
  description: "Foto catatan jadi materi yang kamu ingat.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // The inline script sets data-theme before React hydrates, so the attribute
    // that arrives in the DOM is expected to differ from the server render.
    <html
      lang="id"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
