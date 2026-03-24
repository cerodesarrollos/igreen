"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ventasSubItems = [
  { href: "/ventas",           icon: "space_dashboard",  label: "Resumen"    },
  { href: "/ventas/stock",     icon: "inventory_2",      label: "Stock"      },
  { href: "/ventas/turnos",    icon: "calendar_month",   label: "Turnos"     },
  { href: "/ventas/inbox",     icon: "chat_bubble",      label: "Inbox"      },
  { href: "/ventas/trade-in",  icon: "swap_horiz",       label: "Trade-in"   },
  { href: "/ventas/clientes",  icon: "group",            label: "Clientes"   },
  { href: "/ventas/rendicion", icon: "receipt_long",     label: "Rendición"  },
  { href: "/ventas/metricas",  icon: "bar_chart",        label: "Métricas"   },
  { href: "/ventas/publicidad",icon: "campaign",         label: "Publicidad" },
];

const bottomItems = [
  { href: "/settings", icon: "settings", label: "Configuración" },
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
        relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm select-none
        ${active
          ? "bg-indigo-50 text-indigo-600 font-semibold"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
        }
      `}
    >
      {/* Left accent bar */}
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-indigo-500 rounded-r-full" />
      )}

      {/* Icon */}
      <span
        className="material-symbols-outlined shrink-0 text-[20px]"
        style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
      >
        {icon}
      </span>

      {/* Label */}
      {!collapsed && (
        <span className="flex-1 truncate">{label}</span>
      )}

      {/* Badge */}
      {badge && badge > 0 ? (
        <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shrink-0">
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

  const w = collapsed ? "w-[60px]" : "w-[220px]";

  return (
    <aside
      className={`${w} shrink-0 border-r border-slate-100 bg-white flex flex-col transition-all duration-200 ease-in-out h-full overflow-hidden`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 mb-1">
        <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
          <span className="text-white font-black text-sm tracking-tight">iG</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-black text-slate-900 text-sm tracking-tight leading-tight">iGreen</p>
            <p className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Gestión</p>
          </div>
        )}
      </div>

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-0.5 no-scrollbar">

        {/* Sección Ventas */}
        <div>
          {/* Header sección */}
          {!collapsed && (
            <button
              onClick={() => setVentasOpen(!ventasOpen)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="flex-1 text-left">Ventas iPhone</span>
              <span className={`material-symbols-outlined text-[14px] transition-transform ${ventasOpen ? "" : "-rotate-90"}`}>
                expand_more
              </span>
            </button>
          )}

          {(ventasOpen || collapsed) && (
            <div className="space-y-0.5">
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
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="my-3 border-t border-slate-100" />

        {/* Módulos futuros (locked) */}
        {!collapsed && (
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">
            Próximamente
          </p>
        )}
        {[
          { icon: "build",         label: "Servicio Técnico" },
          { icon: "payments",      label: "Finanzas"         },
          { icon: "receipt_long",  label: "Facturación"      },
        ].map((item) => (
          <div
            key={item.label}
            title={collapsed ? item.label : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 cursor-not-allowed select-none"
          >
            <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
            {!collapsed && <span className="text-sm flex-1 truncate">{item.label}</span>}
            {!collapsed && <span className="material-symbols-outlined text-[14px]">lock</span>}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 space-y-0.5 border-t border-slate-100 pt-3">
        {bottomItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}

        {/* Toggle collapse */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expandir" : "Colapsar"}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition-all"
        >
          <span className="material-symbols-outlined text-[20px] shrink-0 transition-transform" style={{ transform: collapsed ? "scaleX(-1)" : "scaleX(1)" }}>
            left_panel_close
          </span>
          {!collapsed && <span className="text-sm">Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}
