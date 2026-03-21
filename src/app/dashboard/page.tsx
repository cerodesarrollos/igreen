export default function DashboardPage() {
  return (
    <>
      {/* KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Ingresos hoy", value: "$42,850", change: "+12.5%", icon: "payments", up: true },
          { label: "Equipos taller", value: "28", change: "+4%", icon: "devices", up: true },
          { label: "Stock bajo", value: "12", change: "-2%", icon: "inventory_2", up: false },
          { label: "Sin leer", value: "7", change: "+8%", icon: "mail", up: true },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-cool-grey text-[11px] font-bold uppercase tracking-wider">{kpi.label}</p>
              <h3 className="text-xl font-black mt-0.5">{kpi.value}</h3>
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kpi.up ? "text-primary bg-primary/10" : "text-red-500 bg-red-50"}`}>
                {kpi.change}
              </span>
              <div className="mt-2 text-cool-grey">
                <span className="material-symbols-outlined text-lg">{kpi.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Equipos Pendientes */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest">Equipos pendientes</h2>
              <button className="text-cool-grey hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-xl">filter_list</span>
              </button>
            </div>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              <span className="px-2.5 py-1 bg-slate-100 text-[10px] font-bold text-cool-grey rounded border border-slate-200 cursor-pointer">All</span>
              <span className="px-2.5 py-1 bg-primary/10 text-[10px] font-bold text-primary rounded border border-primary/20 cursor-pointer">Ready</span>
              <span className="px-2.5 py-1 bg-slate-100 text-[10px] font-bold text-cool-grey rounded border border-slate-200 cursor-pointer">Waiting</span>
            </div>
            <div className="space-y-4">
              {[
                { name: "Carlos Mendez", device: "iPhone 14 Pro Max", icon: "smartphone", time: "3 DÍAS", urgent: true },
                { name: "Ana Sofia Ruiz", device: "MacBook Air M2", icon: "laptop_mac", time: "1 DÍA", urgent: false },
                { name: "Julio Cesar", device: "Apple Watch S8", icon: "watch", time: "HOY", urgent: false },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between group p-2.5 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-cool-grey">
                      <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    </div>
                    <div>
                      <p className="font-bold text-xs">{item.name}</p>
                      <p className="text-[10px] text-cool-grey">{item.device}</p>
                    </div>
                  </div>
                  <p className={`text-[10px] font-black ${item.urgent ? "text-red-500" : "text-primary"}`}>{item.time}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 text-[11px] font-bold text-cool-grey border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors uppercase tracking-widest">
              Expand List
            </button>
          </div>
        </div>

        {/* Center Column: Revenue + Tickets */}
        <div className="col-span-12 lg:col-span-6 space-y-6">
          {/* Weekly Revenue Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest">Weekly Revenue</h2>
                <p className="text-[10px] text-cool-grey">Earnings 7-day breakdown</p>
              </div>
              <select className="bg-slate-100 border-slate-200 rounded-lg px-3 py-1 text-[10px] font-bold focus:ring-0 border">
                <option>This Week</option>
                <option>Last Week</option>
              </select>
            </div>
            <div className="flex items-end justify-between h-40 px-2 gap-2">
              {[
                { day: "Mon", h: "h-20", active: false },
                { day: "Tue", h: "h-28", active: false },
                { day: "Wed", h: "h-24", active: false },
                { day: "Thu", h: "h-32", active: true },
                { day: "Fri", h: "h-[5.5rem]", active: false },
                { day: "Sat", h: "h-14", active: false },
                { day: "Sun", h: "h-10", active: false },
              ].map((bar) => (
                <div key={bar.day} className="flex flex-col items-center gap-2 flex-1">
                  <div className={`w-full rounded-t-sm ${bar.h} ${bar.active ? "bg-primary relative" : "bg-slate-100 hover:bg-primary/20 transition-all"}`}>
                    {bar.active && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-primary font-bold text-[9px]">$12k</div>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-tighter ${bar.active ? "text-primary" : "text-cool-grey"}`}>
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Service Tickets Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest">Service Tickets</h2>
              <a className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline" href="#">
                VIEW LOG <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-widest text-cool-grey bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 font-bold">Ticket</th>
                    <th className="px-5 py-3 font-bold">Client</th>
                    <th className="px-5 py-3 font-bold">Device</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                    <th className="px-5 py-3 font-bold text-right">Op</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[
                    { ticket: "#IG-9842", client: "Laura Morales", device: "iPhone 13 Pro", status: "Ready", color: "bg-primary text-white" },
                    { ticket: "#IG-9841", client: "Roberto Blanco", device: "MacBook Pro M1", status: "Repair", color: "bg-amber-100 text-amber-700" },
                    { ticket: "#IG-9840", client: "Elena Prieto", device: "iPad Pro 11\"", status: "Logged", color: "bg-slate-100 text-cool-grey" },
                  ].map((row) => (
                    <tr key={row.ticket} className="hover:bg-slate-50 transition-colors text-[11px]">
                      <td className="px-5 py-3 font-bold">{row.ticket}</td>
                      <td className="px-5 py-3">{row.client}</td>
                      <td className="px-5 py-3">{row.device}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 ${row.color} text-[9px] font-black uppercase rounded`}>{row.status}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-cool-grey hover:text-on-surface">
                          <span className="material-symbols-outlined text-base">more_horiz</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Feed */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full">
            <h2 className="text-sm font-black uppercase tracking-widest mb-6">Real-time Feed</h2>
            <div className="space-y-6 relative ml-2">
              <div className="absolute left-[-8px] top-0 bottom-0 w-px bg-slate-100" />
              {[
                { text: "#IG-9842 Ready", sub: "Alex Rivera • 14m ago", color: "bg-primary" },
                { text: "Parts Ordered MB Air", sub: "PO-2231 • 2h ago", color: "bg-amber-500" },
                { text: "New Ticket iPhone 14", sub: "Cust: M. Vazquez • 4h ago", color: "bg-blue-500" },
                { text: "Daily Report Printed", sub: "Sarah J. • 5h ago", color: "bg-slate-300" },
              ].map((feed, i) => (
                <div key={i} className="relative pl-4">
                  <div className={`absolute left-[-11px] top-1 w-1.5 h-1.5 rounded-full ${feed.color} ring-4 ring-white`} />
                  <div>
                    <p className="text-[11px] font-bold">{feed.text}</p>
                    <p className="text-[9px] text-cool-grey mt-0.5">{feed.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 pt-6 border-t border-slate-100">
              <p className="text-[10px] font-bold text-cool-grey uppercase tracking-widest mb-4">Quick Commands</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "print", label: "Print Tag" },
                  { icon: "contact_support", label: "Email Client" },
                ].map((cmd) => (
                  <button key={cmd.label} className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-cool-grey hover:text-primary transition-all">
                    <span className="material-symbols-outlined mb-1">{cmd.icon}</span>
                    <span className="text-[9px] font-bold uppercase">{cmd.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
