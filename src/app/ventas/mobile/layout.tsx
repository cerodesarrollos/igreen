"use client";

import Link from "next/link";

export default function MobileVentasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-white overflow-auto">
      {/* Close button to exit mobile view */}
      <Link
        href="/ventas"
        className="fixed top-3 right-3 z-[60] w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center md:hidden"
        aria-label="Cerrar vista móvil"
      >
        <span className="material-symbols-outlined text-slate-500 text-lg">close</span>
      </Link>
      {children}
    </div>
  );
}
