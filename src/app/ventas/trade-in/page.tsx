"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface TradeInPrice {
  id: string;
  model: string;
  condition: string;
  min_battery: number;
  price_usd: number;
}

interface TradeIn {
  id: string;
  client_name: string;
  client_phone: string;
  model_received: string;
  condition: string;
  battery_health: number;
  price_offered: number;
  status: string;
  notes: string | null;
  created_at: string;
}

function formatPrice(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")} USD`;
}

const emptyForm = {
  client_name: "",
  client_phone: "",
  model_received: "",
  condition: "A" as string,
  battery_health: 100,
  price_offered: "",
  notes: "",
};

export default function TradeInPage() {
  const [tradeInPrices, setTradeInPrices] = useState<TradeInPrice[]>([]);
  const [tradeIns, setTradeIns] = useState<TradeIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pricesRes, histRes] = await Promise.all([
      supabase.from("ig_trade_in_prices").select("*").order("model"),
      supabase.from("ig_trade_ins").select("*").order("created_at", { ascending: false }),
    ]);
    setTradeInPrices((pricesRes.data || []) as TradeInPrice[]);
    setTradeIns((histRes.data || []) as TradeIn[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Trade-in pricing table */
  const tradeInModels = Array.from(new Set(tradeInPrices.map((t) => t.model)));
  const tradeInTable = tradeInModels.map((model) => {
    const rows = tradeInPrices.filter((t) => t.model === model);
    const a = rows.find((r) => r.condition === "A");
    const b = rows.find((r) => r.condition === "B");
    const c = rows.find((r) => r.condition === "C");
    const bat = rows[0]?.min_battery || 0;
    return { model, a: a?.price_usd || 0, b: b?.price_usd || 0, c: c?.price_usd || 0, bat };
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      client_name: form.client_name,
      client_phone: form.client_phone,
      model_received: form.model_received,
      condition: form.condition,
      battery_health: form.battery_health,
      price_offered: form.price_offered ? parseFloat(form.price_offered) : 0,
      status: "pendiente",
      notes: form.notes || null,
    };
    const { error } = await supabase.from("ig_trade_ins").insert(payload);
    if (!error) {
      setShowAddModal(false);
      setForm(emptyForm);
      await fetchData();
    } else {
      alert("Error: " + error.message);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-sm text-cool-grey">Cargando trade-in...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trade-in</h2>
          <p className="text-on-surface-variant text-sm mt-1">Cotización y registro de equipos en parte de pago</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowAddModal(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm shadow-md shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">add</span> Registrar Trade-in
        </button>
      </div>

      {/* Pricing Table */}
      <section className="mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-2 bg-green-50 rounded-lg">
              <span className="material-symbols-outlined text-green-600">swap_horiz</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">Cotización Trade-in</h3>
              <p className="text-on-surface-variant text-xs mt-0.5">Referencia de precios para cotizar equipos en parte de pago</p>
            </div>
          </div>

          {tradeInTable.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-cool-grey">
              <span className="material-symbols-outlined text-4xl mb-3">swap_horiz</span>
              <p className="text-sm font-medium">No hay precios de trade-in cargados</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Modelo</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey bg-green-50">Estado A — Impecable</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey bg-amber-50">Estado B — Detalles menores</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey bg-red-50">Estado C — Uso visible</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Batería mín.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tradeInTable.map((row, i) => (
                    <tr key={row.model} className={`hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                      <td className="px-6 py-3.5 text-sm font-bold">{row.model}</td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold text-green-700">${row.a}</span>
                        <span className="text-[10px] text-slate-400 ml-1">USD</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold text-amber-700">${row.b}</span>
                        <span className="text-[10px] text-slate-400 ml-1">USD</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold text-red-600">${row.c}</span>
                        <span className="text-[10px] text-slate-400 ml-1">USD</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-slate-400">battery_5_bar</span>
                          <span className="text-sm font-bold">{row.bat}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-blue-600 text-lg mt-0.5">smart_toy</span>
            <p className="text-xs text-blue-800 leading-relaxed">
              El agente IA usa esta tabla para cotizar equipos automáticamente. Cuando un cliente envía fotos, GPT Vision analiza el estado y cotiza según estos valores de referencia.
            </p>
          </div>
        </div>
      </section>

      {/* Trade-in History */}
      <section>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            <h3 className="text-lg font-bold">Historial de Trade-ins</h3>
          </div>
          {tradeIns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-cool-grey">
              <span className="material-symbols-outlined text-3xl mb-2">swap_horiz</span>
              <p className="text-xs font-medium">Sin trade-ins registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Fecha</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Cliente</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Modelo Recibido</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Condición</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Precio</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tradeIns.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm">
                        {new Date(t.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium">{t.client_name}</p>
                        <p className="text-[10px] text-cool-grey">{t.client_phone}</p>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold">{t.model_received}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          t.condition === "A" ? "bg-green-100 text-green-700" : t.condition === "B" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                        }`}>{t.condition}</span>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold">{formatPrice(t.price_offered)}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                          t.status === "completado" ? "bg-green-100 text-green-700" : t.status === "cancelado" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                        }`}>{t.status.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Registrar Trade-in</h3>
              <button onClick={() => setShowAddModal(false)} className="text-cool-grey hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Cliente *</label>
                <input required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Teléfono</label>
                <input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Modelo Recibido *</label>
                <input required value={form.model_received} onChange={(e) => setForm({ ...form, model_received: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                  placeholder="iPhone 13 Pro" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Condición</label>
                  <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                    <option value="A">A — Impecable</option>
                    <option value="B">B — Detalles</option>
                    <option value="C">C — Uso visible</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Batería %</label>
                  <input type="number" min={0} max={100} value={form.battery_health}
                    onChange={(e) => setForm({ ...form, battery_health: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Precio Ofrecido (USD)</label>
                <input type="number" step="0.01" value={form.price_offered}
                  onChange={(e) => setForm({ ...form, price_offered: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 resize-none"
                  rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-200 rounded-full text-sm font-bold hover:bg-slate-300 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-primary text-white rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:brightness-95 transition-all disabled:opacity-50">
                  {saving ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
