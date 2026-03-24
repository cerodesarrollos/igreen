import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import CursorGlow from "@/components/CursorGlow";

export const metadata: Metadata = {
  title: "iGreen",
  description: "Sistema de gestión para iGreen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0d0d10" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased" style={{ background: "#080809", color: "#ededed" }}>
        {/* Cursor glow — fixed overlay, pointer-events-none */}
        <CursorGlow />

        {/* Outer shell — adds padding + rounded corners to the whole app */}
        <div className="relative z-10 h-screen w-screen p-3 box-border">
          <div className="flex h-full overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d0d10]/95 backdrop-blur-sm">
            <Sidebar />
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <Header />
              <main className="flex-1 overflow-y-auto px-8 py-8">
                <div className="max-w-[1400px] mx-auto">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
