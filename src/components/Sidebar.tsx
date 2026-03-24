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
      className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors select-none ${
        active
          ? "bg-white/10 text-white font-medium"
          : "text-[#888] hover:text-[#ededed] hover:bg-white/5"
      }`}
    >
      <span
        className="material-symbols-outlined text-[16px] shrink-0"
        style={{ fontVariationSettings: active ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300" }}
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
    <aside className={`${w} shrink-0 border-r border-[#1a1a1a] bg-[#0a0a0a] flex flex-col transition-all duration-150 h-full overflow-hidden`}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-4 border-b border-[#1a1a1a]">
        <div className="w-6 h-6 rounded bg-white flex items-center justify-center shrink-0">
          <span className="text-black font-black text-[10px]">iG</span>
        </div>
        {!collapsed && <span className="text-sm font-semibold text-white">iGreen</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-px no-scrollbar">
        {!collapsed && (
          <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-widest text-[#444]">
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

        <div className="pt-3">
          {!collapsed && (
            <p className="px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-widest text-[#333]">
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
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[#333] cursor-not-allowed select-none"
            >
              <span className="material-symbols-outlined text-[16px] shrink-0">{item.icon}</span>
              {!collapsed && <span className="text-sm truncate flex-1">{item.label}</span>}
              {!collapsed && <span className="material-symbols-outlined text-[12px] text-[#333]">lock</span>}
            </div>
          ))}
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-2 py-2 border-t border-[#1a1a1a] space-y-px">
        <NavItem href="/settings" icon="settings" label="Ajustes" active={pathname === "/settings"} collapsed={collapsed} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[#555] hover:text-[#ededed] hover:bg-white/5 transition-colors text-sm"
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
