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
    <header className="h-12 shrink-0 border-b border-[#1a1a1a] flex items-center justify-between px-6">
      <p className="text-sm font-medium text-[#ededed]">{page}</p>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-md px-3 py-1.5 w-48 lg:w-64 hover:border-[#333] transition-colors">
          <span className="material-symbols-outlined text-[#555] text-base">search</span>
          <input
            className="bg-transparent text-sm text-[#ededed] placeholder:text-[#444] outline-none w-full"
            placeholder="Buscar..."
          />
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-[11px] font-semibold text-[#888]">
            MF
          </div>
        </div>
      </div>
    </header>
  );
}
