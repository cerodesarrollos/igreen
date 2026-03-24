import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "iGreen — Servicio Técnico Apple",
  description: "Sistema de gestión para servicio técnico Apple",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#34C759" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="antialiased text-on-surface bg-slate-200/60">
        {/* App Window */}
        <div className="m-3 rounded-2xl overflow-hidden bg-white border border-slate-200/80 shadow-xl h-[calc(100vh-1.5rem)] flex">
          {/* Sidebar inside window */}
          <Sidebar />
          {/* Right side: Header + Content */}
          <div className="flex-1 flex flex-col min-h-0">
            <Header />
            <main className="flex-1 p-6 overflow-y-auto">
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
