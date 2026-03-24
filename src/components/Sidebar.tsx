"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ventasSubItems = [
  { href: "/ventas",            icon: "space_dashboard", label: "Resumen"     },
  { href: "/ventas/stock",      icon: "inventory_2",     label: "Stock"       },
  { href: "/ventas/turnos",     icon: "calendar_month",  label: "Turnos"      },
  { href: "/ventas/inbox",      icon: "chat_bubble",     label: "Inbox"       },
  { href: "/ventas/trade-in",   icon: "swap_horiz",      label: "Trade-in"    },
  { href: "/ventas/clientes",   icon: "group",           label: "Clientes"    },
  { href: "/ventas/rendicion",  icon: "receipt_long",    label: "Rendición"   },
  { href: "/ventas/metricas",   icon: "bar_chart",       label: "Métricas"    },
  { href: "/ventas/publicidad", icon: "campaign",        label: "Publicidad"  },
];

function NavItem({
  href, icon, label, active, collapsed,
}: {
  href: string; icon: string; label: string; active: boolean; collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`
        relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-sm select-none
        ${active
          ? "text-white"
          : "text-slate-500 hover:text-slate-300 hover:bg-white/4"
        }
      `}
    >
      {/* Active: gradient bg + left bar */}
      {active && (
        <>
          <span className="absolute inset-0 rounded-lg bg-gradient-to-r from-violet-500/20 to-transparent" />
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-400 rounded-r-full" />
        </>
      )}
      <span
        className={`material-symbols-outlined shrink-0 text-[18px] relative z-10 ${active ? "text-violet-400" : ""}`}
        style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300" }}
      >
        {icon}
      </span>
      {!collapsed && (
        <span className="relative z-10 flex-1 truncate font-medium">{label}</span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const w = collapsed ? "w-[56px]" : "w-[216px]";

  return (
    <aside
      className={`${w} shrink-0 flex flex-col transition-all duration-200 ease-in-out h-full overflow-hidden border-r`}
      style={{
        background: "rgba(12, 13, 20, 0.95)",
        borderColor: "rgba(139, 92, 246, 0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 shrink-0">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}
        >
          <span className="text-white font-black text-[11px] tracking-tight">iG</span>
        </div>
        {!collapsed && (
          <span className="text-sm font-bold text-white tracking-tight">iGreen</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-px no-scrollbar py-2">
        {!collapsed && (
          <p className="px-3 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-widest text-slate-600">
            Ventas iPhone
          </p>
        )}

        {ventasSubItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}

        {/* Divider */}
        <div className="my-3 border-t border-white/5" />

        {!collapsed && (
          <p className="px-3 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-widest text-slate-700">
            Próximamente
          </p>
        )}
        {[
          { icon: "build",        label: "Serv. Técnico" },
          { icon: "payments",     label: "Finanzas"      },
          { icon: "receipt_long", label: "Facturación"   },
        ].map((item) => (
          <div
            key={item.label}
            title={collapsed ? item.label : undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 cursor-not-allowed select-none"
          >
            <span className="material-symbols-outlined text-[18px] shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="text-sm flex-1 truncate">{item.label}</span>
                <span className="material-symbols-outlined text-[12px] text-slate-700">lock</span>
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 pt-2 border-t border-white/5 space-y-px">
        <NavItem href="/settings" icon="settings" label="Ajustes" active={pathname === "/settings"} collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir" : "Colapsar"}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/4 transition-all"
        >
          <span
            className="material-symbols-outlined text-[18px] shrink-0 transition-transform duration-200"
            style={{ transform: collapsed ? "scaleX(-1)" : "scaleX(1)" }}
          >
            left_panel_close
          </span>
          {!collapsed && <span className="text-sm">Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}
