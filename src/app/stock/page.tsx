export default function StockPage() {
  const products = [
    { sku: "AAPL-IP14-128-BK", name: "iPhone 14 Pro Max", variant: "128GB Black", cost: "$899", sale: "$1099", stock: 12, status: "ok" },
    { sku: "AAPL-IP13-256-BL", name: "iPhone 13", variant: "256GB Sierra Blue", cost: "$649", sale: "$799", stock: 4, status: "low" },
    { sku: "AAPL-IP15-128-WH", name: "iPhone 15", variant: "128GB White", cost: "$799", sale: "$899", stock: 18, status: "ok" },
    { sku: "AAPL-IP13-SCRN-O", name: "iPhone 13 Screen", variant: "OLED Assembly", cost: "$120", sale: "$280", stock: 1, status: "critical" },
    { sku: "AAPL-MACB-AIR-M1", name: "MacBook Air M1", variant: "8GB/256GB Silver", cost: "$750", sale: "$949", stock: 6, status: "ok" },
  ];

  const categories = [
    { icon: "smartphone", label: "iPhone", active: true },
    { icon: "laptop_mac", label: "Mac", active: false },
    { icon: "tablet_mac", label: "iPad", active: false },
    { icon: "watch", label: "Accessories", active: false },
    { icon: "settings_input_component", label: "Parts", active: false },
  ];

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock & Inventory</h2>
          <p className="text-on-surface-variant text-sm mt-1">Manage products, parts and stock levels</p>
        </div>
      </div>

      {/* Alert Banner */}
      <section className="mb-8 p-6 bg-red-50 border border-red-100 rounded-xl flex items-start gap-4">
        <span className="material-symbols-outlined text-red-500 mt-0.5">report</span>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-red-800 mb-2">Critical Stock Alerts</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: "iPhone 13 Screen", count: "1 left" },
              { name: "USB-C Power Adapter", count: "0 left" },
              { name: "MBP M1 Battery", count: "2 left" },
            ].map((alert) => (
              <div key={alert.name} className="bg-white/60 p-3 rounded-lg flex justify-between items-center border border-red-100/50">
                <span className="text-xs font-medium">{alert.name}</span>
                <span className="text-xs font-bold text-red-500">{alert.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-12 gap-8">
        {/* Categories Sidebar */}
        <div className="col-span-12 lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-cool-grey mb-4 px-2">Categories</h3>
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <button key={cat.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  cat.active ? "bg-white text-primary shadow-sm" : "text-cool-grey hover:bg-slate-100"
                }`}>
                  <span className="material-symbols-outlined">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-cool-grey mb-4 px-2">Stock Status</h3>
            <div className="flex flex-col gap-1">
              <button className="flex items-center gap-3 px-4 py-3 text-cool-grey hover:bg-slate-100 rounded-xl font-medium text-sm">
                <span className="material-symbols-outlined">list</span> All Items
              </button>
              <button className="flex items-center gap-3 px-4 py-3 text-cool-grey hover:bg-slate-100 rounded-xl font-medium text-sm">
                <span className="material-symbols-outlined text-amber-500">warning</span> Low Stock
              </button>
              <button className="flex items-center gap-3 px-4 py-3 text-cool-grey hover:bg-slate-100 rounded-xl font-medium text-sm">
                <span className="material-symbols-outlined text-red-500">error</span> Out of Stock
              </button>
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="col-span-12 lg:col-span-7">
          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-cool-grey">search</span>
                <input className="w-full pl-12 pr-6 py-3 bg-white rounded-xl border border-slate-200 focus:ring-1 focus:ring-primary/30 transition-all text-sm" placeholder="Search SKU or product name..." type="text" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm shadow-md shadow-primary/20">
                <span className="material-symbols-outlined text-lg">add</span> Add Product
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary-dark rounded-full font-bold text-sm">
                <span className="material-symbols-outlined text-lg">inventory</span> Stock Entry
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">SKU</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Product Name</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Variant</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Cost</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Sale</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Stock</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {products.map((p) => (
                    <tr key={p.sku} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 font-mono text-xs text-cool-grey">{p.sku}</td>
                      <td className="px-4 py-4 font-bold text-sm">{p.name}</td>
                      <td className="px-4 py-4 text-sm text-on-surface-variant">{p.variant}</td>
                      <td className="px-4 py-4 text-sm font-medium text-cool-grey">{p.cost}</td>
                      <td className="px-4 py-4 text-sm font-bold">{p.sale}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${p.status === "critical" ? "bg-red-500" : p.status === "low" ? "bg-amber-400" : "bg-primary"}`} />
                          <span className={`text-sm font-bold ${p.status === "critical" ? "text-red-500" : p.status === "low" ? "text-amber-600" : "text-primary"}`}>{p.stock}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-slate-50 flex justify-between items-center text-xs font-medium text-cool-grey border-t border-slate-100">
              <span>Showing 5 of 142 products</span>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-bold">1</button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100">2</button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100">3</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Detail */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 sticky top-24">
            <h2 className="text-xl font-black mb-6">Item Detail</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-cool-grey">smartphone</span>
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">iPhone 14 Pro Max</p>
                <h3 className="text-sm font-bold">AAPL-IP14-128-BK</h3>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-[10px] text-cool-grey uppercase font-bold mb-1">Total Stock</p>
                <p className="text-2xl font-black">12 <span className="text-xs font-normal text-cool-grey">units</span></p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-[10px] text-cool-grey uppercase font-bold mb-1">Asset Value</p>
                <p className="text-2xl font-black">$10,788</p>
              </div>
            </div>
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-4">30-Day Trend</h4>
              <div className="h-24 w-full flex items-end gap-1 px-1">
                {[40, 50, 45, 60, 75, 90, 85, 100, 95].map((h, i) => (
                  <div key={i} className={`flex-1 rounded-t-sm ${i >= 4 ? "bg-primary/60" : "bg-slate-100"}`} style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>
            <div className="mb-6">
              <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Variants</h4>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                {[
                  { v: "128GB Black", u: "8 units" },
                  { v: "256GB Black", u: "3 units" },
                  { v: "512GB Black", u: "1 unit" },
                ].map((v) => (
                  <div key={v.v} className="flex justify-between items-center pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                    <span className="text-xs font-medium text-on-surface-variant">{v.v}</span>
                    <span className="text-xs font-bold">{v.u}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Recent Movement</h4>
              <div className="space-y-3">
                {[
                  { icon: "shopping_cart", text: "Sale - Order #9021", sub: "Oct 24 • 14:30", delta: "-1", color: "text-red-500" },
                  { icon: "local_shipping", text: "Purchase Entry", sub: "Oct 22 • 09:15", delta: "+10", color: "text-primary" },
                  { icon: "assignment_return", text: "Customer Return", sub: "Oct 20 • 11:45", delta: "+1", color: "text-primary" },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm text-cool-grey">{m.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold">{m.text}</p>
                      <p className="text-[10px] text-cool-grey">{m.sub}</p>
                    </div>
                    <span className={`text-xs font-bold ${m.color}`}>{m.delta}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
