import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
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
