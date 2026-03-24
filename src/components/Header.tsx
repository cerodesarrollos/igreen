"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, { section: string; page: string }> = {
  "/ventas":            { section: "Ventas iPhone", page: "Resumen"     },
  "/ventas/stock":      { section: "Ventas iPhone", page: "Stock"       },
  "/ventas/turnos":     { section: "Ventas iPhone", page: "Turnos"      },
  "/ventas/inbox":      { section: "Ventas iPhone", page: "Inbox"       },
  "/ventas/trade-in":   { section: "Ventas iPhone", page: "Trade-in"    },
  "/ventas/clientes":   { section: "Ventas iPhone", page: "Clientes"    },
  "/ventas/rendicion":  { section: "Ventas iPhone", page: "Rendición"   },
  "/ventas/metricas":   { section: "Ventas iPhone", page: "Métricas"    },
  "/ventas/publicidad": { section: "Ventas iPhone", page: "Publicidad"  },
  "/settings":          { section: "iGreen",        page: "Configuración" },
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || { section: "iGreen", page: "" };

  return (
    <header className="sticky top-0 z-40 bg-[#1a1d27]/80 backdrop-blur-md border-b border-[#2a2d3e] flex items-center justify-between px-6 h-14 shrink-0">

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm text-slate-500 truncate">{title.section}</span>
        {title.page && (
          <>
            <span className="material-symbols-outlined text-slate-600 text-sm">chevron_right</span>
            <span className="text-sm font-semibold text-slate-200 truncate">{title.page}</span>
          </>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center bg-[#0f1117] px-3 py-1.5 rounded-lg w-56 lg:w-64 border border-[#2a2d3e] mx-4 shrink-0 gap-2">
        <span className="material-symbols-outlined text-slate-500 text-lg">search</span>
        <input
          className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-600 outline-none text-slate-300"
          placeholder="Buscar..."
          type="text"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 shrink-0">
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all">
          <span className="material-symbols-outlined text-[20px]">settings</span>
        </button>
        <div className="h-5 w-px bg-[#2a2d3e] mx-1" />
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs">
            MF
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-300">Matias</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
