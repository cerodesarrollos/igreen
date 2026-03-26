"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import CursorGlow from "@/components/CursorGlow";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const isLoginPage = pathname === "/login";

  // Redirect a login si no hay sesión (después de cargar)
  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.replace("/login");
    }
  }, [loading, user, isLoginPage, router]);

  // Login page → full screen sin shell
  if (isLoginPage) {
    return (
      <div className="h-screen w-screen" style={{ background: "#080809" }}>
        {children}
      </div>
    );
  }

  // Cargando sesión → spinner centrado
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: "#0d0d10" }}>
        <div className="w-5 h-5 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  // Sin sesión → vacío (redirect en curso)
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Desktop: padding + rounded shell */}
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

      {/* Mobile: sin sidebar ni header */}
      <div className="md:hidden h-screen w-screen overflow-hidden" style={{ background: "#0d0d10" }}>
        <main className="h-full w-full overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </>
  );
}
