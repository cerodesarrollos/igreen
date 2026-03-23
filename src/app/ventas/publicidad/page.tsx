"use client";

export default function PublicidadPage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight text-slate-300">Publicidad</h2>
        <p className="text-slate-400 text-sm mt-1">Gestión de campañas publicitarias</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <div className="p-6 bg-slate-50 rounded-2xl mb-6">
            <span className="material-symbols-outlined text-6xl">campaign</span>
          </div>
          <h3 className="text-xl font-bold text-slate-500 mb-2">Módulo de Publicidad — Próximamente</h3>
          <p className="text-sm text-slate-400 text-center max-w-md leading-relaxed">
            Gestión de campañas, ROAS y publicaciones desde un solo lugar.
            Podrás programar publicaciones, medir el rendimiento de tus anuncios
            y optimizar tu inversión publicitaria.
          </p>
          <div className="mt-8 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-5 py-3">
            <span className="material-symbols-outlined text-slate-400">lock</span>
            <p className="text-xs font-medium text-slate-500">Este módulo estará disponible próximamente</p>
          </div>
        </div>
      </div>
    </>
  );
}
