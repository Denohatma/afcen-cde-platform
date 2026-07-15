import Link from "next/link";
import { FileCheck, LayoutDashboard, FolderOpen, Database } from "lucide-react";
import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <title>AfCEN CDE — Common Data Environment</title>
        <meta
          name="description"
          content="AfCEN Common Data Environment for infrastructure feasibility studies"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-[#06080c] text-[#c8d0dc] terminal-grid">
        <nav className="glass-elevated sticky top-0 z-50">
          <div className="mx-auto max-w-[1600px] flex items-center justify-between px-5 h-11">
            <div className="flex items-center gap-5 sm:gap-6">
              <Link href="/" className="flex items-center gap-2.5 shrink-0">
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[#ff8c00]/15 border border-[#ff8c00]/20">
                  <FileCheck className="h-3.5 w-3.5 text-[#ff8c00]" />
                </div>
                <span className="text-sm font-semibold tracking-tight text-[#ff8c00] bloomberg-glow">
                  AfCEN CDE
                </span>
              </Link>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-0.5 text-[11px] overflow-x-auto no-scrollbar">
                <Link
                  href="/"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[#64748b] hover:text-[#ff8c00] hover:bg-[#ff8c00]/5 transition-all uppercase tracking-[0.12em] whitespace-nowrap"
                >
                  <LayoutDashboard className="h-3 w-3" />
                  Dashboard
                </Link>
                <Link
                  href="/projects"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[#64748b] hover:text-[#ff8c00] hover:bg-[#ff8c00]/5 transition-all uppercase tracking-[0.12em] whitespace-nowrap"
                >
                  <FolderOpen className="h-3 w-3" />
                  Projects
                </Link>
                <Link
                  href="/benchmarks"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[#64748b] hover:text-[#ff8c00] hover:bg-[#ff8c00]/5 transition-all uppercase tracking-[0.12em] whitespace-nowrap"
                >
                  <Database className="h-3 w-3" />
                  Benchmarks
                </Link>
              </div>
            </div>
            <span className="hidden lg:block text-[10px] text-[#475569] uppercase tracking-[0.2em] shrink-0">
              Common Data Environment
            </span>
          </div>
        </nav>

        <main className="min-h-[calc(100vh-2.75rem)]">{children}</main>
      </body>
    </html>
  );
}
