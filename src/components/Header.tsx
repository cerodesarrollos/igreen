"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, { section: string; page: string }> = {
  "/ventas": { section: "Venta de iPhone", page: "Resumen" },
  "/ventas/stock": { section: "Venta de iPhone", page: "Stock" },
  "/ventas/turnos": { section: "Venta de iPhone", page: "Turnos" },
  "/ventas/inbox": { section: "Venta de iPhone", page: "Inbox" },
  "/ventas/trade-in": { section: "Venta de iPhone", page: "Trade-in" },
  "/ventas/clientes": { section: "Venta de iPhone", page: "Clientes" },
  "/ventas/rendicion": { section: "Venta de iPhone", page: "Rendición" },
  "/ventas/metricas": { section: "Venta de iPhone", page: "Métricas" },
  "/ventas/publicidad": { section: "Venta de iPhone", page: "Publicidad" },
  "/dashboard": { section: "iGreen", page: "Dashboard" },
  "/servicio-tecnico": { section: "iGreen", page: "Servicio Técnico" },
  "/stock": { section: "iGreen", page: "Stock" },
  "/finanzas": { section: "iGreen", page: "Finanzas" },
  "/inbox": { section: "iGreen", page: "Inbox" },
  "/facturacion": { section: "iGreen", page: "Facturación" },
  "/settings": { section: "iGreen", page: "Configuración" },
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || { section: "iGreen", page: "" };

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-5rem)] lg:w-[calc(100%-15rem)] z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 h-16 transition-all">
      {/* Left: Page title breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-sm font-bold text-on-surface truncate">
          {title.section}
        </h1>
        {title.page && (
          <>
            <span className="material-symbols-outlined text-slate-300 text-base">chevron_right</span>
            <span className="text-sm font-medium text-cool-grey truncate">{title.page}</span>
          </>
        )}
      </div>

      {/* Center-right: Search */}
      <div className="flex items-center bg-slate-100 px-4 py-1.5 rounded-lg w-56 lg:w-72 border border-slate-200 mx-4 shrink-0">
        <span className="material-symbols-outlined text-cool-grey text-xl mr-2">
          search
        </span>
        <input
          className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-cool-grey outline-none"
          placeholder="Buscar (CMD + K)"
          type="text"
        />
      </div>

      {/* Right: Actions + Profile */}
      <div className="flex items-center gap-4 shrink-0">
        <button className="text-cool-grey hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-cool-grey hover:text-on-surface transition-colors">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="h-6 w-px bg-slate-200 mx-1" />
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="font-bold text-xs">Matias</p>
            <p className="text-[9px] uppercase tracking-wider text-cool-grey">
              Admin
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            MF
          </div>
        </div>
      </div>
    </header>
  );
}
