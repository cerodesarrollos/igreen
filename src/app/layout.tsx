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
      </head>
      <body className="antialiased text-on-surface">
        <Sidebar />
        <Header />
        <main className="ml-20 lg:ml-60 pt-20 p-6 min-h-screen transition-all">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}
