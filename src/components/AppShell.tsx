"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import CursorGlow from "@/components/CursorGlow";

const PUBLIC_PATHS = ["/login", "/privacy"];
const PRINT_PREFIX = "/ventas/print";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const redirecting = useRef(false);

  const isPublic = PUBLIC_PATHS.includes(pathname) || pathname.startsWith(PRINT_PREFIX);

  useEffect(() => {
    if (!loading && !user && !isPublic && !redirecting.current) {
      redirecting.current = true;
      window.location.replace("/login");
    }
  }, [loading, user, isPublic]);

  // Páginas públicas: sin shell
  if (isPublic) {
    return <>{children}</>;
  }

  // Autenticado: shell completo
  if (!loading && user) {
    return (
      <>
        {/* Desktop */}
        <div className="hidden md:block h-screen w-screen p-3 box-border">
          <div
            className="relative flex h-full overflow-hidden rounded-2xl border border-white/[0.06]"
            style={{ background: "#0d0d10" }}
          >
            <CursorGlow />
            <div className="relative z-10 flex w-full h-full">
              <Sidebar />
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <Header />
                <main className="flex-1 overflow-hidden flex flex-col">
                  {children}
                </main>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile */}
        <div className="md:hidden h-screen w-screen overflow-hidden" style={{ background: "#0d0d10" }}>
          <main className="h-full w-full overflow-hidden flex flex-col">{children}</main>
        </div>
      </>
    );
  }

  // Cargando o sin sesión: spinner simple
  return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: "#0d0d10" }}>
      <div className="w-5 h-5 border border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  );
}
