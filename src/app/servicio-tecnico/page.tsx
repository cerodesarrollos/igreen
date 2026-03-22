export default function ServicioTecnicoPage() {
  const tickets = [
    { id: "#IG-9842", device: "iPhone 13 Pro", client: "Laura Morales", date: "15 Mar 2024", status: "En reparación", icon: "smartphone", active: true },
    { id: "#IG-9839", device: "MacBook Air M2", client: "Carlos Ruiz", date: "14 Mar 2024", status: "Ingresado", icon: "laptop_mac", active: false },
    { id: "#IG-9835", device: "Apple Watch S7", client: "Elena Gómez", date: "12 Mar 2024", status: "Listo para retiro", icon: "watch", active: false },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Servicio Técnico</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gestión de reparaciones y diagnósticos</p>
        </div>
        <button className="bg-primary hover:opacity-90 text-white rounded-full px-6 py-3 flex items-center gap-2 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
          <span className="material-symbols-outlined">add_circle</span>
          <span>Nuevo Ticket</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
        {["Todos", "Ingresado", "En diagnóstico", "Presupuesto enviado", "En reparación", "Listo para retiro"].map((f, i) => (
          <button key={f} className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
            i === 0 ? "bg-on-surface text-white" : i === 4 ? "bg-primary/10 text-primary-dark ring-1 ring-primary/50 font-bold" : "bg-slate-200 text-on-surface-variant hover:bg-slate-300 transition-colors"
          }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Ticket List */}
        <div className="col-span-12 lg:col-span-7 space-y-4">
          {tickets.map((t) => (
            <div key={t.id} className={`bg-white p-6 rounded-xl flex justify-between items-center group cursor-pointer transition-all hover:-translate-y-0.5 ${
              t.active ? "ring-2 ring-primary/20 shadow-xl shadow-on-surface/5" : "shadow-sm hover:bg-slate-50"
            }`}>
              <div className="flex items-center gap-6">
                <div className="bg-slate-100 p-4 rounded-lg">
                  <span className={`material-symbols-outlined text-3xl ${t.active ? "text-primary" : "text-on-surface-variant"}`}>{t.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-xs font-bold tracking-wider ${t.active ? "text-primary" : "text-on-surface-variant opacity-60"}`}>{t.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter ${
                      t.status === "En reparación" ? "bg-primary/20 text-primary-dark" :
                      t.status === "Listo para retiro" ? "bg-green-100 text-green-700" :
                      "bg-slate-200 text-on-surface-variant"
                    }`}>{t.status}</span>
                  </div>
                  <h3 className="text-lg font-bold">{t.device}</h3>
                  <p className="text-sm text-on-surface-variant">{t.client} • {t.date}</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant opacity-30 group-hover:opacity-100 transition-opacity">chevron_right</span>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="col-span-12 lg:col-span-5">
          <div className="bg-white rounded-xl p-8 sticky top-24 shadow-2xl shadow-on-surface/10 border border-white">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-black">iPhone 13 Pro</h2>
                <p className="text-sm font-medium text-on-surface-variant opacity-70">SN: G6TVX0WPF01D</p>
              </div>
              <select className="appearance-none bg-primary/10 border-none text-primary-dark text-xs font-bold rounded-full py-2 px-6 focus:ring-2 focus:ring-primary/20">
                <option>En reparación</option>
                <option>En diagnóstico</option>
                <option>Listo para retiro</option>
              </select>
            </div>

            {/* Evidence */}
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-3 opacity-60">Galería de evidencia</p>
              <div className="flex gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-24 h-24 bg-slate-100 rounded-md flex items-center justify-center">
                    <span className="material-symbols-outlined text-cool-grey">image</span>
                  </div>
                ))}
                <div className="w-24 h-24 bg-slate-50 rounded-md flex flex-col items-center justify-center border-2 border-dashed border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant opacity-50">add_a_photo</span>
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-3 opacity-60">Informe de diagnóstico</p>
              <div className="bg-slate-50 p-5 rounded-lg border-l-4 border-primary">
                <p className="text-sm leading-relaxed">
                  <span className="font-bold">Resumen:</span> Pantalla rota, sensor Face ID dañado. Conector interno con signos de oxidación. Requiere reemplazo completo del ensamble de pantalla y recalibración del sensor.
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-4 opacity-60">Línea de tiempo</p>
              <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                {[
                  { text: "Repuestos pedidos", sub: "16 Mar, 9:00 • Técnico: Matias" },
                  { text: "Diagnóstico completado", sub: "15 Mar, 14:30 • Técnico: Matias" },
                  { text: "Ticket creado", sub: "15 Mar, 10:00 • Recepción: Kennet" },
                ].map((step, i) => (
                  <div key={i} className="relative pl-8">
                    <div className="absolute left-0 top-1 w-[24px] h-[24px] bg-primary rounded-full ring-4 ring-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{step.text}</p>
                      <p className="text-xs text-on-surface-variant">{step.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-10 flex gap-3">
              <button className="flex-1 bg-slate-200 hover:bg-slate-300 font-bold py-3 rounded-full transition-all active:scale-95">Imprimir Etiqueta</button>
              <button className="flex-1 bg-primary text-white font-bold py-3 rounded-full shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95">Actualizar Estado</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
