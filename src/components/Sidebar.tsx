"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { href: "/servicio-tecnico", icon: "build", label: "Servicio Técnico" },
  { href: "/stock", icon: "inventory_2", label: "Stock" },
  { href: "/finanzas", icon: "payments", label: "Finanzas" },
  { href: "/inbox", icon: "inbox", label: "Inbox" },
  { href: "/facturacion", icon: "receipt_long", label: "Facturación" },
];

export default function Sidebar() {
  const pathname = usePathname();

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
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
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
