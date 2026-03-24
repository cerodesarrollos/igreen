"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ventasItems = [
  { href: "/ventas",            icon: "space_dashboard", label: "Resumen"    },
  { href: "/ventas/stock",      icon: "inventory_2",     label: "Stock"      },
  { href: "/ventas/turnos",     icon: "calendar_month",  label: "Turnos"     },
  { href: "/ventas/inbox",      icon: "chat_bubble",     label: "Inbox"      },
  { href: "/ventas/trade-in",   icon: "swap_horiz",      label: "Trade-in"   },
  { href: "/ventas/clientes",   icon: "group",           label: "Clientes"   },
  { href: "/ventas/rendicion",  icon: "receipt_long",    label: "Rendición"  },
  { href: "/ventas/metricas",   icon: "bar_chart",       label: "Métricas"   },
  { href: "/ventas/publicidad", icon: "campaign",        label: "Publicidad" },
];

function NavItem({ href, icon, label, active, collapsed }: {
  href: string; icon: string; label: string; active: boolean; collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors select-none ${
        active
          ? "bg-violet-600/15 text-violet-300 font-semibold border border-violet-500/20"
          : "text-white/40 hover:bg-white/[0.04] hover:text-white/70"
      }`}
    >
      <span
        className="material-symbols-outlined text-[16px] shrink-0"
        style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300", color: active ? '#a78bfa' : undefined }}
      >
        {icon}
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const w = collapsed ? "w-[48px]" : "w-[200px]";

  return (
    <aside className={`${w} shrink-0 bg-[#111114] border-r border-white/[0.06] flex flex-col transition-all duration-150 h-full overflow-hidden`}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-white/[0.06]">
        <div className="w-6 h-6 rounded bg-violet-500 flex items-center justify-center shrink-0" style={{boxShadow:'0 0 12px rgba(139,92,246,0.5)'}}>
          <span className="text-black font-black text-[10px]">iG</span>
        </div>
        {!collapsed && <span className="text-sm font-semibold text-white/90">iGreen</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-px no-scrollbar">
        {!collapsed && (
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
            Ventas
          </p>
        )}
        {ventasItems.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={pathname === item.href}
            collapsed={collapsed}
          />
        ))}

        <div className="pt-2">
          {!collapsed && (
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/10">
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
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/15 cursor-not-allowed select-none"
            >
              <span className="material-symbols-outlined text-[16px] shrink-0">{item.icon}</span>
              {!collapsed && (
                <>
                  <span className="text-sm truncate flex-1">{item.label}</span>
                  <span className="material-symbols-outlined text-[12px]">lock</span>
                </>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="p-2 border-t border-white/[0.06] space-y-px">
        <NavItem href="/settings" icon="settings" label="Ajustes" active={pathname === "/settings"} collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/50 hover:text-white/50 hover:bg-white/[0.04] transition-colors text-sm"
        >
          <span
            className="material-symbols-outlined text-[16px] shrink-0 transition-transform"
            style={{ transform: collapsed ? "scaleX(-1)" : "scaleX(1)" }}
          >
            left_panel_close
          </span>
          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}
