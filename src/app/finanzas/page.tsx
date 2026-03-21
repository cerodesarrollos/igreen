export default function FinanzasPage() {
  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Finanzas</h2>
          <p className="text-on-surface-variant text-sm mt-1">Financial overview and cash management</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-full">
          <button className="px-4 py-1.5 text-xs font-bold rounded-full bg-white shadow-sm">Hoy</button>
          <button className="px-4 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface">Semana</button>
          <button className="px-4 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface">Mes</button>
        </div>
      </div>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Ingresos del día", value: "$12,450", icon: "trending_up", iconBg: "bg-green-50", iconColor: "text-green-600", change: "+5.2%", changeColor: "text-green-600 bg-green-100" },
          { label: "Egresos del día", value: "$4,200", icon: "trending_down", iconBg: "bg-red-50", iconColor: "text-red-600", change: "-2.1%", changeColor: "text-red-600 bg-red-100" },
          { label: "Balance", value: "$8,250", icon: "account_balance_wallet", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
          { label: "Facturación pendiente", value: "$3,100", icon: "pending_actions", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 ${kpi.iconBg} rounded-lg`}>
                <span className={`material-symbols-outlined ${kpi.iconColor}`}>{kpi.icon}</span>
              </div>
              {kpi.change && (
                <span className={`text-[10px] font-bold ${kpi.changeColor} px-2 py-0.5 rounded-full`}>{kpi.change}</span>
              )}
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-medium mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold tracking-tight">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Chart + Table */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* Chart */}
          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold tracking-tight">Actividad Mensual</h3>
                <p className="text-xs text-on-surface-variant">Comparativa diaria de ingresos vs egresos</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ingresos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Egresos</span>
                </div>
              </div>
            </div>
            <div className="h-48 flex items-end gap-3 justify-between">
              {[
                { day: "01", inH: 12, outH: 8 },
                { day: "02", inH: 24, outH: 10 },
                { day: "03", inH: 32, outH: 14 },
                { day: "HOY", inH: 40, outH: 12, active: true },
                { day: "05", inH: 16, outH: 6, future: true },
                { day: "06", inH: 20, outH: 8, future: true },
                { day: "07", inH: 14, outH: 4, future: true },
              ].map((bar, i) => (
                <div key={i} className={`flex-1 flex flex-col items-center gap-1 ${bar.future ? "opacity-40" : ""}`}>
                  <div className="w-full flex items-end gap-1">
                    <div className={`flex-1 rounded-t-sm ${bar.active ? "bg-primary shadow-sm shadow-primary/30" : bar.future ? "bg-slate-200" : "bg-primary/40"}`} style={{ height: `${bar.inH * 4.5}px` }} />
                    <div className={`flex-1 rounded-t-sm ${bar.future ? "bg-slate-100" : "bg-slate-200"}`} style={{ height: `${bar.outH * 4.5}px` }} />
                  </div>
                  <span className={`text-[10px] font-bold ${bar.active ? "text-on-surface" : "text-cool-grey"}`}>{bar.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Transacciones Recientes</h3>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors">
                  <span className="material-symbols-outlined text-sm">calendar_month</span> Rango de fecha
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors">
                  <span className="material-symbols-outlined text-sm">filter_list</span> Tipo
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-on-surface-variant">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Descripción</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Monto</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Pago</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Documento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { time: "14:20", type: "Venta", typeBg: "bg-green-100 text-green-700", desc: "Reparación iPhone 13 Pro Max", amount: "+$4,500", amountColor: "text-green-600", payment: "Transferencia", doc: "#IG-9842" },
                    { time: "13:45", type: "Gasto", typeBg: "bg-red-100 text-red-700", desc: "Repuestos OLED Display (x5)", amount: "-$2,100", amountColor: "text-red-600", payment: "MercadoPago", doc: "#OC-5521" },
                    { time: "12:10", type: "Compra", typeBg: "bg-orange-100 text-orange-700", desc: "Mobiliario Local Nuevo", amount: "-$1,500", amountColor: "text-red-600", payment: "Tarjeta", doc: "#FA-2022" },
                    { time: "10:30", type: "Cobro", typeBg: "bg-green-100 text-green-700", desc: "Cambio Batería MacBook Air", amount: "+$1,200", amountColor: "text-green-600", payment: "Efectivo", doc: "#IG-9830" },
                  ].map((tx, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">{tx.time}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 ${tx.typeBg} text-[10px] font-bold rounded-full`}>{tx.type}</span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold">{tx.desc}</td>
                      <td className={`px-6 py-4 text-xs font-black ${tx.amountColor}`}>{tx.amount}</td>
                      <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">{tx.payment}</td>
                      <td className="px-6 py-4 text-xs font-bold text-primary">{tx.doc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Cash Register */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="space-y-4">
            <button className="w-full py-4 bg-gradient-to-b from-primary-dark to-primary text-white rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all">
              <span className="material-symbols-outlined">add_circle</span> Nuevo Ingreso
            </button>
            <button className="w-full py-4 bg-transparent border-2 border-primary text-primary rounded-full font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/5 transition-all">
              <span className="material-symbols-outlined">remove_circle</span> Registrar Egreso
            </button>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold">Caja Diaria</h3>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Abierta
              </span>
            </div>
            <div className="space-y-6">
              {[
                { icon: "schedule", label: "Apertura", value: "08:30 AM" },
                { icon: "sync_alt", label: "Movimientos", value: "24 trans." },
                { icon: "query_stats", label: "Cierre proyectado", value: "$15,800", highlight: true },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant">{item.icon}</span>
                    </div>
                    <p className="text-sm font-medium text-on-surface-variant">{item.label}</p>
                  </div>
                  <p className={`text-sm font-bold ${item.highlight ? "text-primary" : ""}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-8 border-t border-slate-100 flex gap-3">
              <button className="flex-1 py-3 bg-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors">Imprimir X</button>
              <button className="flex-1 py-3 bg-on-surface text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity">Cerrar Caja</button>
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-xl border border-primary/10">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary">info</span>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Nota del sistema</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">El balance de hoy es superior en un 12% comparado al promedio mensual. ¡Buen trabajo!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
