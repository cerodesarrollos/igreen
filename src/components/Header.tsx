"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useState, useRef, useEffect } from "react";

const pageTitles: Record<string, string> = {
  "/ventas":            "Resumen",
  "/ventas/stock":      "Stock",
  "/ventas/turnos":     "Turnos",
  "/ventas/inbox":      "Inbox",
  "/ventas/trade-in":   "Trade-in",
  "/ventas/clientes":   "Clientes",
  "/ventas/rendicion":  "Rendición",
  "/ventas/metricas":   "Métricas",
  "/ventas/publicidad": "Publicidad",
  "/settings":          "Ajustes",
};

export default function Header() {
  const pathname = usePathname();
  const page = pageTitles[pathname] || "";
  const { igUser, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = igUser?.name
    ? igUser.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : igUser?.email?.slice(0, 2).toUpperCase() || "?";

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="shrink-0 border-b border-white/[0.06] bg-[#111114] flex items-center justify-between px-3 py-4">
      <p className="text-sm font-semibold text-white/80 pl-0.5">{page}</p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 w-48 lg:w-64 hover:border-white/[0.1] transition-colors">
          <span className="material-symbols-outlined text-white/50 text-base">search</span>
          <input
            className="bg-transparent text-sm text-white/70 placeholder:text-white/45 outline-none w-full"
            placeholder="Buscar..."
          />
        </div>

        {/* User menu */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(!open)}
            className="w-7 h-7 rounded-full bg-white/[0.07] border border-white/[0.08] flex items-center justify-center text-[11px] font-semibold text-white/50 hover:bg-white/[0.10] transition-colors"
            title={igUser?.name || igUser?.email || ""}
          >
            {initials}
          </button>

          {open && (
            <div
              className="absolute right-0 top-9 w-48 rounded-xl border border-white/[0.08] shadow-xl z-50 overflow-hidden"
              style={{ background: "#1e1e22" }}
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-xs font-medium text-white/70 truncate">{igUser?.name || "—"}</p>
                <p className="text-[10px] text-white/35 truncate mt-0.5">{igUser?.email}</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/[0.07] text-white/50 uppercase tracking-wider">
                  {igUser?.role || "—"}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-white/50 hover:bg-white/[0.04] hover:text-white/70 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">logout</span>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
