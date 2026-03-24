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

interface NavItemProps {
  href: string;
  icon: string;
  label: string;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}

function NavItem({ href, icon, label, active, collapsed, badge }: NavItemProps) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`
        relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm select-none group
        ${active
          ? "bg-violet-500/15 text-violet-400 font-medium"
          : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
        }
      `}
    >
      <span
        className="material-symbols-outlined shrink-0 text-[18px]"
        style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300" }}
      >
        {icon}
      </span>
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {badge && badge > 0 ? (
        <span className="ml-auto text-[9px] font-bold bg-violet-500 text-white rounded-full w-4 h-4 flex items-center justify-center shrink-0">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ventasOpen, setVentasOpen] = useState(true);
  const isInVentas = pathname.startsWith("/ventas");

  useEffect(() => {
    if (isInVentas) setVentasOpen(true);
  }, [isInVentas]);

  const w = collapsed ? "w-[56px]" : "w-[220px]";

  return (
    <aside className={`${w} shrink-0 bg-[#1a1d27] border-r border-[#2a2d3e] flex flex-col transition-all duration-200 ease-in-out h-full overflow-hidden`}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="w-7 h-7 rounded-lg bg-violet-500 flex items-center justify-center shrink-0">
          <span className="text-white font-black text-xs tracking-tight">iG</span>
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-white text-sm tracking-tight">iGreen</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-0.5 no-scrollbar py-2">

        {/* Sección principal */}
        {!collapsed && (
          <button
            onClick={() => setVentasOpen(!ventasOpen)}
            className="w-full flex items-center gap-2 px-3 py-1.5 mb-1"
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 flex-1 text-left">
              Ventas iPhone
            </span>
            <span className={`material-symbols-outlined text-[14px] text-slate-500 transition-transform ${ventasOpen ? "" : "-rotate-90"}`}>
              expand_more
            </span>
          </button>
        )}

        {(ventasOpen || collapsed) && ventasSubItems.map((item) => (
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
        <div className="my-3 border-t border-[#2a2d3e]" />

        {!collapsed && (
          <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-1">
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
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-600 cursor-not-allowed select-none"
          >
            <span className="material-symbols-outlined text-[18px] shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="text-sm flex-1 truncate">{item.label}</span>
                <span className="material-symbols-outlined text-[14px]">lock</span>
              </>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 pt-3 border-t border-[#2a2d3e] space-y-0.5">
        <NavItem href="/settings" icon="settings" label="Configuración" active={pathname === "/settings"} collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir" : "Colapsar"}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-slate-300 transition-all"
        >
          <span
            className="material-symbols-outlined text-[18px] shrink-0 transition-transform"
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
