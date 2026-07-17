import type { Metadata } from "next";
import type { ReactNode } from "react";
import ClientShell from "@/components/client-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "AfCEN CDE",
  description: "AfCEN Common Data Environment",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#08090d] text-[#c8d0dc] terminal-grid">
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
