"use client";

import { usePathname } from "next/navigation";

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

  return (
    <header className="h-12 shrink-0 border-b border-white/[0.06] bg-[#111114] flex items-center justify-between px-6">
      <p className="text-sm font-semibold text-white/80">{page}</p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 w-48 lg:w-64 hover:border-white/[0.1] transition-colors">
          <span className="material-symbols-outlined text-white/25 text-base">search</span>
          <input
            className="bg-transparent text-sm text-white/70 placeholder:text-white/20 outline-none w-full"
            placeholder="Buscar..."
          />
        </div>
        <div className="w-7 h-7 rounded-full bg-white/[0.07] border border-white/[0.08] flex items-center justify-center text-[11px] font-semibold text-white/50">
          MF
        </div>
      </div>
    </header>
  );
}
