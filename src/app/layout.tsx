import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "iGreen — Gestión",
  description: "Sistema de gestión para iGreen",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#080a10" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased" style={{ background: "#080a10", color: "#e2e8f0" }}>
        {/* Ambient glow top */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl" />
          <div className="absolute top-20 right-20 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-[1600px] mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
