"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, { section: string; page: string }> = {
  "/ventas":            { section: "Ventas iPhone", page: "Resumen"      },
  "/ventas/stock":      { section: "Ventas iPhone", page: "Stock"        },
  "/ventas/turnos":     { section: "Ventas iPhone", page: "Turnos"       },
  "/ventas/inbox":      { section: "Ventas iPhone", page: "Inbox"        },
  "/ventas/trade-in":   { section: "Ventas iPhone", page: "Trade-in"     },
  "/ventas/clientes":   { section: "Ventas iPhone", page: "Clientes"     },
  "/ventas/rendicion":  { section: "Ventas iPhone", page: "Rendición"    },
  "/ventas/metricas":   { section: "Ventas iPhone", page: "Métricas"     },
  "/ventas/publicidad": { section: "Ventas iPhone", page: "Publicidad"   },
  "/settings":          { section: "iGreen",        page: "Configuración"},
};

export default function Header() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || { section: "iGreen", page: "" };

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-6 h-14 shrink-0 border-b"
      style={{
        background: "rgba(8, 10, 16, 0.8)",
        backdropFilter: "blur(20px)",
        borderColor: "rgba(255,255,255,0.05)",
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm text-slate-600 truncate">{title.section}</span>
        {title.page && (
          <>
            <span className="material-symbols-outlined text-slate-700 text-sm">chevron_right</span>
            <span className="text-sm font-semibold text-slate-200 truncate">{title.page}</span>
          </>
        )}
      </div>

      {/* Search */}
      <div
        className="flex items-center px-3 py-1.5 rounded-xl w-56 lg:w-72 mx-4 shrink-0 gap-2 border transition-all focus-within:border-violet-500/40"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <span className="material-symbols-outlined text-slate-600 text-lg">search</span>
        <input
          className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-600 outline-none text-slate-300"
          placeholder="Buscar..."
          type="text"
        />
        <kbd className="hidden lg:flex items-center gap-0.5 text-[9px] text-slate-700 bg-white/5 border border-white/8 rounded px-1 py-0.5 font-mono">
          ⌘K
        </kbd>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 transition-all hover:bg-white/5"
          title="Notificaciones"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
        </button>
        <div className="h-4 w-px bg-white/8 mx-1" />
        <div className="flex items-center gap-2.5 cursor-pointer group">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-violet-300 font-bold text-xs"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(99,102,241,0.4))" }}
          >
            MF
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-300 group-hover:text-white transition-colors">Matias</p>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider">Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
