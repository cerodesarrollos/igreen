"use client";

export default function InboxVentasPage() {
  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Inbox de Ventas</h2>
        <p className="text-on-surface-variant text-sm mt-1">Mensajes relacionados con operaciones de venta</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        {/* Mock filter bar */}
        <div className="flex items-center gap-4 mb-8 opacity-50">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary rounded-full text-sm font-bold">
            <span className="material-symbols-outlined text-lg">inbox</span> Todos
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-cool-grey rounded-full text-sm font-medium">
            <span className="material-symbols-outlined text-lg">mark_email_unread</span> Sin leer
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-cool-grey rounded-full text-sm font-medium">
            <span className="material-symbols-outlined text-lg">star</span> Destacados
          </div>
          <div className="flex-1" />
          <div className="relative opacity-50">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cool-grey">search</span>
            <input
              disabled
              className="pl-10 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm w-64"
              placeholder="Buscar mensajes..."
            />
          </div>
        </div>

        {/* Placeholder */}
        <div className="flex flex-col items-center justify-center py-24 text-cool-grey">
          <div className="p-4 bg-slate-50 rounded-2xl mb-4">
            <span className="material-symbols-outlined text-5xl">chat</span>
          </div>
          <h3 className="text-lg font-bold text-on-surface mb-2">Inbox de Ventas — Próximamente</h3>
          <p className="text-sm text-on-surface-variant text-center max-w-md">
            Los mensajes relacionados con ventas aparecerán aquí. Podrás gestionar consultas de clientes,
            seguimientos de reservas y notificaciones de ventas desde un solo lugar.
          </p>
          <div className="mt-6 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-blue-600 text-lg">smart_toy</span>
            <p className="text-xs text-blue-800">Integración con WhatsApp e IA en desarrollo</p>
          </div>
        </div>
      </div>
    </>
  );
}
