"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  const isLoginPage = pathname === "/login";

  // En login (o cargando sin sesión) → solo renderizar children sin shell
  if (isLoginPage || (!loading && !user)) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Desktop: sidebar + header */}
      <div className="hidden md:flex w-full h-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-hidden flex flex-col">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile: sin sidebar ni header */}
      <div className="md:hidden h-full w-full overflow-hidden flex flex-col">
        <main className="h-full w-full overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </>
  );
}
