export default function FacturacionPage() {
  const invoices = [
    { num: "0001-00001234", tipo: "Tipo A", date: "12 Oct 2023", client: "Juan Delgado S.A.", initials: "JD", amount: "$45.600,00", status: "EMITIDA", statusColor: "bg-primary/10 text-primary-dark" },
    { num: "0001-00001233", tipo: "Tipo B", date: "11 Oct 2023", client: "Marta Gomez", amount: "$12.400,00", status: "PENDIENTE", statusColor: "bg-orange-100 text-orange-700", amountColor: "text-orange-600" },
    { num: "0001-00001232", tipo: "Tipo A", date: "10 Oct 2023", client: "TechCorp Inc.", amount: "$152.000,00", status: "ANULADA", statusColor: "bg-red-100 text-red-700" },
  ];

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Facturación</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gestión de facturas e impuestos</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Facturado", value: "$1.2M", change: "+12%" },
          { label: "IVA Estimado", value: "$252k" },
          { label: "Facturas Emitidas", value: "42" },
          { label: "Pendientes de Cobro", value: "$120k", accent: true },
        ].map((card) => (
          <div key={card.label} className={`bg-white p-6 rounded-xl border border-slate-200 flex flex-col justify-between h-32 ${card.accent ? "border-l-4 border-l-orange-500" : ""}`}>
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{card.label}</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-3xl font-extrabold tracking-tight ${card.accent ? "text-orange-500" : ""}`}>{card.value}</span>
              {card.change && <span className="text-xs text-primary font-bold">{card.change}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Table */}
        <div className="flex-1 w-full space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl">
            <div className="flex items-center gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-cool-grey px-1">Fecha</label>
                <select className="bg-white border border-slate-200 rounded-full text-xs py-1.5 pl-3 pr-8 focus:ring-1 focus:ring-primary/30">
                  <option>Últimos 30 días</option>
                  <option>Mes actual</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-cool-grey px-1">Tipo</label>
                <select className="bg-white border border-slate-200 rounded-full text-xs py-1.5 pl-3 pr-8 focus:ring-1 focus:ring-primary/30">
                  <option>Todos</option>
                  <option>Factura A</option>
                  <option>Factura B</option>
                  <option>Nota de Crédito</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-cool-grey px-1">Estado</label>
                <div className="flex bg-white rounded-full p-1 gap-1 border border-slate-200">
                  <button className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-full">TODOS</button>
                  <button className="px-3 py-1 text-cool-grey text-[10px] font-bold rounded-full hover:bg-slate-50">IMPAGO</button>
                </div>
              </div>
            </div>
            <button className="flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-bold text-xs shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all">
              <span className="material-symbols-outlined text-sm">add</span> Nueva Factura
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Número</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map((inv) => (
                  <tr key={inv.num} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{inv.num}</span>
                        <span className="text-[10px] text-cool-grey font-bold uppercase">{inv.tipo}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-on-surface-variant">{inv.date}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {inv.initials && (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold">{inv.initials}</div>
                        )}
                        <span className="text-sm font-semibold">{inv.client}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 font-extrabold text-sm ${inv.amountColor || ""}`}>{inv.amount}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold ${inv.statusColor}`}>{inv.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        <aside className="w-full lg:w-96 space-y-6">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="material-symbols-outlined text-slate-100 text-6xl rotate-12">receipt</span>
            </div>
            <div className="relative">
              <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-1">Detalle de Factura</p>
              <h2 className="text-2xl font-extrabold tracking-tight mb-6">A-0001-1234</h2>
              <div className="space-y-4 mb-8">
                {[
                  { label: "Concepto", value: "Reemplazo Pantalla iPhone 14 Pro" },
                  { label: "CAE", value: "74123456789012", mono: true },
                  { label: "Vto. CAE", value: "25/10/2023" },
                ].map((d) => (
                  <div key={d.label} className="flex justify-between items-center text-sm">
                    <span className="text-on-surface-variant font-medium">{d.label}</span>
                    <span className={`font-bold ${d.mono ? "font-mono" : ""}`}>{d.value}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-slate-200 py-6 space-y-3">
                {[
                  { label: "Subtotal Neto", value: "$37.685,95" },
                  { label: "IVA (21%)", value: "$7.914,05" },
                  { label: "IIBB (3.5%)", value: "$1.319,00" },
                ].map((line) => (
                  <div key={line.label} className="flex justify-between text-sm">
                    <span className="text-cool-grey">{line.label}</span>
                    <span className="font-semibold">{line.value}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-4 mt-2 border-t border-slate-100">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-extrabold text-primary">$46.919,00</span>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl flex flex-col items-center gap-2 mb-8">
                <div className="w-full h-12 bg-white flex items-center justify-center p-2 rounded border border-slate-100">
                  <div className="flex gap-px items-end h-full">
                    {Array.from({ length: 30 }).map((_, i) => (
                      <div key={i} className="w-1 bg-slate-300" style={{ height: `${20 + Math.random() * 60}%` }} />
                    ))}
                  </div>
                </div>
                <span className="text-[8px] font-mono text-cool-grey">27-12345678-9-01-0001-00001234-74123456789012-20231025</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 bg-slate-200 font-bold text-xs py-3 rounded-full hover:bg-slate-300 transition-all">
                  <span className="material-symbols-outlined text-sm">print</span> Imprimir
                </button>
                <button className="flex items-center justify-center gap-2 bg-slate-200 font-bold text-xs py-3 rounded-full hover:bg-slate-300 transition-all">
                  <span className="material-symbols-outlined text-sm">download</span> PDF
                </button>
                <button className="col-span-2 flex items-center justify-center gap-2 bg-red-50 text-red-500 font-bold text-xs py-3 rounded-full hover:bg-red-100 transition-all">
                  <span className="material-symbols-outlined text-sm">cancel</span> Anular Factura
                </button>
              </div>
            </div>
          </div>
          <div className="bg-primary/5 p-4 rounded-xl flex gap-3 border border-primary/10">
            <span className="material-symbols-outlined text-primary">info</span>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              <strong className="text-primary">Tip Pro:</strong> Puedes enviar facturas automáticas al cliente vinculando su Apple ID en la orden de reparación.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
