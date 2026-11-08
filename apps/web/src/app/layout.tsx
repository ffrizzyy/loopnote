import type { Metadata } from "next";

import { loadEnv } from "@/env";

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
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
