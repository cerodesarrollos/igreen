"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/ventas", icon: "phone_iphone", label: "Venta de iPhone", isVentas: true },
  { href: "/dashboard", icon: "dashboard", label: "Dashboard", locked: true },
  { href: "/servicio-tecnico", icon: "build", label: "Servicio Técnico", locked: true },
  { href: "/stock", icon: "inventory_2", label: "Stock", locked: true },
  { href: "/finanzas", icon: "payments", label: "Finanzas", locked: true },
  { href: "/inbox", icon: "inbox", label: "Inbox", locked: true },
  { href: "/facturacion", icon: "receipt_long", label: "Facturación", locked: true },
];

const ventasSubItems = [
  { href: "/ventas", icon: "bar_chart", label: "Resumen" },
  { href: "/ventas/stock", icon: "inventory_2", label: "Stock" },
  { href: "/ventas/turnos", icon: "calendar_month", label: "Turnos" },
  { href: "/ventas/inbox", icon: "chat", label: "Inbox" },
  { href: "/ventas/trade-in", icon: "swap_horiz", label: "Trade-in" },
  { href: "/ventas/clientes", icon: "people", label: "Clientes" },
  { href: "/ventas/rendicion", icon: "receipt", label: "Rendición" },
  { href: "/ventas/metricas", icon: "bar_chart", label: "Métricas" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isInVentas = pathname.startsWith("/ventas");
  const [ventasOpen, setVentasOpen] = useState(isInVentas);

  useEffect(() => {
    if (isInVentas) setVentasOpen(true);
  }, [isInVentas]);

  return (
    <aside className="h-screen w-20 lg:w-60 fixed left-0 top-0 border-r border-slate-200 bg-white flex flex-col p-4 space-y-6 z-50 transition-all">
      {/* Logo */}
      <div className="flex flex-col items-center lg:items-start lg:px-2">
        <span className="text-xl font-black tracking-tighter text-primary">
          igreen
        </span>
        <span className="hidden lg:block text-[9px] uppercase tracking-[0.2em] font-bold text-cool-grey mt-0.5">
          Servicio Técnico
        </span>
      </div>

      {/* New Repair Button */}
      <button className="w-full bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-95 transition-all shadow-sm">
        <span className="material-symbols-outlined">add</span>
        <span className="hidden lg:block">Nueva Reparación</span>
      </button>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          // Ventas de iPhone — collapsible with sub-items
          if (item.isVentas) {
            return (
              <div key="ventas-section">
                <button
                  onClick={() => setVentasOpen(!ventasOpen)}
                  className={`w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isInVentas
                      ? "text-primary font-bold bg-slate-50"
                      : "text-cool-grey hover:bg-slate-50"
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="hidden lg:block flex-1 text-left">{item.label}</span>
                  <span className={`material-symbols-outlined text-sm hidden lg:block transition-transform ${ventasOpen ? "rotate-180" : ""}`}>
                    expand_more
                  </span>
                </button>

                {ventasOpen && (
                  <div className="ml-0 lg:ml-4 mt-1 space-y-0.5">
                    {ventasSubItems.map((sub) => {
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`flex items-center justify-center lg:justify-start gap-3 px-3 py-2 rounded-lg transition-all text-sm ${
                            isSubActive
                              ? "text-primary font-bold bg-primary/5"
                              : "text-cool-grey hover:bg-slate-50"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">{sub.icon}</span>
                          <span className="hidden lg:block">{sub.label}</span>
                        </Link>
                      );
                    })}

                    {/* Publicidad — disabled */}
                    <div
                      className="flex items-center justify-center lg:justify-start gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 cursor-not-allowed"
                      title="Próximamente"
                    >
                      <span className="material-symbols-outlined text-[20px]">lock</span>
                      <span className="hidden lg:block">Publicidad</span>
                    </div>
                  </div>
                )}
              </div>
            );
          }

          // Locked items
          if (item.locked) {
            return (
              <div
                key={item.href}
                className="flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg text-slate-300 cursor-not-allowed"
                title="Próximamente"
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="hidden lg:block flex-1">{item.label}</span>
                <span className="material-symbols-outlined text-[16px] hidden lg:block">lock</span>
              </div>
            );
          }

          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive
                  ? "text-primary font-bold bg-slate-50"
                  : "text-cool-grey hover:bg-slate-50"
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="hidden lg:block">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="pt-4 border-t border-slate-100 space-y-1">
        <Link
          href="/settings"
          className={`flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg transition-all ${
            pathname === "/settings"
              ? "text-primary font-bold bg-slate-50"
              : "text-cool-grey hover:bg-slate-50"
          }`}
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="hidden lg:block">Configuración</span>
        </Link>
        <button className="flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 text-cool-grey hover:bg-slate-50 rounded-lg transition-all w-full">
          <span className="material-symbols-outlined">logout</span>
          <span className="hidden lg:block">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}
