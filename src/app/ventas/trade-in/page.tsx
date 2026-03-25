"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

type HistoryFilter = "todos" | "pendiente" | "completado" | "cancelado";

export default function TradeInPage() {
  const [tradeInPrices, setTradeInPrices] = useState<TradeInPrice[]>([]);
  const [tradeIns, setTradeIns] = useState<TradeIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<string | null>(null);

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Cotizador state
  const [quoterModel, setQuoterModel] = useState("");
  const [quoterCondition, setQuoterCondition] = useState<"A" | "B" | "C">("A");
  const [quoterBattery, setQuoterBattery] = useState(100);

  // History filter
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("todos");

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

  // Set default quoter model
  useEffect(() => {
    if (tradeInModels.length > 0 && !quoterModel) {
      setQuoterModel(tradeInModels[0]);
    }
  }, [tradeInModels, quoterModel]);

  // KPI calculations
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const tradeInsThisMonth = tradeIns.filter((t) => new Date(t.created_at) >= monthStart);
  const kpiCount = tradeInsThisMonth.length;
  const kpiPending = tradeIns.filter((t) => t.status === "pendiente").length;
  const kpiAvgPrice = tradeInsThisMonth.length > 0
    ? Math.round(tradeInsThisMonth.reduce((sum, t) => sum + (t.price_offered || 0), 0) / tradeInsThisMonth.length)
    : 0;
  const kpiTopModel = useMemo(() => {
    if (tradeInsThisMonth.length === 0) return "—";
    const counts: Record<string, number> = {};
    tradeInsThisMonth.forEach((t) => { counts[t.model_received] = (counts[t.model_received] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [tradeInsThisMonth]);

  // Cotizador lookup
  const quoterPrice = useMemo(() => {
    const match = tradeInPrices.find((p) => p.model === quoterModel && p.condition === quoterCondition);
    return match?.price_usd || null;
  }, [tradeInPrices, quoterModel, quoterCondition]);

  const quoterMinBattery = useMemo(() => {
    const match = tradeInPrices.find((p) => p.model === quoterModel && p.condition === quoterCondition);
    return match?.min_battery || 0;
  }, [tradeInPrices, quoterModel, quoterCondition]);

  const batteryBelowMin = quoterBattery < quoterMinBattery;

  // Filtered history
  const filteredHistory = historyFilter === "todos"
    ? tradeIns
    : tradeIns.filter((t) => t.status === historyFilter);

  function openModalFromQuoter() {
    setEditingId(null);
    setForm({
      ...emptyForm,
      model_received: quoterModel,
      condition: quoterCondition,
      battery_health: quoterBattery,
      price_offered: quoterPrice ? String(quoterPrice) : "",
    });
    setShowAddModal(true);
  }

  function openEditModal(t: TradeIn) {
    setEditingId(t.id);
    setForm({
      client_name: t.client_name,
      client_phone: t.client_phone || "",
      model_received: t.model_received,
      condition: t.condition,
      battery_health: t.battery_health,
      price_offered: t.price_offered ? String(t.price_offered) : "",
      notes: t.notes || "",
    });
    setShowAddModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      client_name: form.client_name,
      client_phone: form.client_phone,
      model_received: form.model_received,
      condition: form.condition,
      battery_health: form.battery_health,
      price_offered: form.price_offered ? parseFloat(form.price_offered) : 0,
      notes: form.notes || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("ig_trade_ins").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("ig_trade_ins").insert({ ...payload, status: "pendiente" }));
    }

    if (!error) {
      setShowAddModal(false);
      setEditingId(null);
      setForm(emptyForm);
      await fetchData();
    } else {
      alert("Error: " + error.message);
    }
    setSaving(false);
  }

  async function handleStatusChange(id: string, newStatus: "completado" | "cancelado") {
    const { error } = await supabase.from("ig_trade_ins").update({ status: newStatus }).eq("id", id);
    if (!error) {
      await fetchData();
    } else {
      alert("Error: " + error.message);
    }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("ig_trade_ins").delete().eq("id", id);
    if (!error) {
      setDeleteConfirmId(null);
      await fetchData();
    } else {
      alert("Error: " + error.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3eff8e]"></div>
        <span className="ml-3 text-sm text-white/45">Cargando trade-in...</span>
      </div>
    );
  }

  const conditionChipClass = (c: "A" | "B" | "C", active: boolean) => {
    if (!active) return "bg-white/[0.06] text-white/55 hover:bg-white/[0.08]";
    if (c === "A") return "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 shadow-green-200";
    if (c === "B") return "bg-amber-500 text-white shadow-amber-200";
    return "bg-red-500 text-white shadow-red-200";
  };

  function BatteryBar({ value, size = "normal" }: { value: number; size?: "normal" | "mini" }) {
    const color = value > 85 ? "bg-green-500" : value >= 80 ? "bg-amber-500" : "bg-red-500";
    const h = size === "mini" ? "h-1.5" : "h-2";
    return (
      <div className="flex items-center gap-2">
        <div className={`flex-1 ${h} bg-white/[0.06] rounded-full overflow-hidden`} style={{ minWidth: size === "mini" ? 40 : 60 }}>
          <div className={`${h} ${color} rounded-full transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
        </div>
        <span className={`font-bold ${size === "mini" ? "text-[11px]" : "text-xs"} tabular-nums`}>{value}%</span>
      </div>
    );
  }

  return (
    <div className="px-8 py-8 overflow-y-auto flex-1">
    <>
      {/* Action button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => { setEditingId(null); setForm(emptyForm); setShowAddModal(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e] rounded-full font-bold text-sm  hover:brightness-95 transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span> Registrar Trade-in
        </button>
      </div>

      {/* ============ 1. KPI Cards Row ============ */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Trade-ins del Mes", value: String(kpiCount), icon: "swap_horiz", iconBg: "bg-[#3eff8e]/15", iconColor: "text-[#3eff8e]" },
          { label: "Pendientes", value: String(kpiPending), icon: "pending_actions", iconBg: "bg-amber-50", iconColor: "text-amber-400" },
          { label: "Modelo Top", value: kpiTopModel, icon: "phone_iphone", iconBg: "bg-blue-50", iconColor: "text-blue-400", small: true },
          { label: "Valor Promedio", value: kpiAvgPrice > 0 ? `$${kpiAvgPrice} USD` : "—", icon: "attach_money", iconBg: "bg-green-50", iconColor: "text-emerald-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 px-5 py-4 flex items-center gap-4">
            <div className={`w-10 h-10 ${kpi.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
              <span className={`material-symbols-outlined text-xl ${kpi.iconColor}`}>{kpi.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/45">{kpi.label}</p>
              <p className={`font-bold mt-0.5 truncate ${kpi.small ? "text-sm" : "text-lg"}`}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ============ 2. Cotizador Rápido ============ */}
      <section className="mb-6">
        <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-[#3eff8e]/15 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-[#3eff8e]">calculate</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">Cotizador Rápido</h3>
              <p className="text-[11px] text-white/45">Cotizá en vivo frente al cliente</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-start">
            {/* Left: Controls */}
            <div className="space-y-5">
              {/* Model selector */}
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/45 block mb-1.5">Modelo</label>
                <select
                  value={quoterModel}
                  onChange={(e) => setQuoterModel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm font-medium focus:ring-1 focus:ring-[#3eff8e]/30 focus:outline-none"
                >
                  {tradeInModels.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Condition chips */}
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/45 block mb-2">Condición</label>
                <div className="flex gap-2">
                  {(["A", "B", "C"] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setQuoterCondition(c)}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${conditionChipClass(c, quoterCondition === c)}`}
                    >
                      {c === "A" ? "A — Impecable" : c === "B" ? "B — Detalles" : "C — Uso visible"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Battery */}
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/45 block mb-1.5">
                  Batería
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={quoterBattery}
                    onChange={(e) => setQuoterBattery(parseInt(e.target.value))}
                    className="flex-1 h-2 accent-primary"
                  />
                  <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg border border-white/[0.08] px-3 py-1.5">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={quoterBattery}
                      onChange={(e) => setQuoterBattery(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-10 text-sm font-bold text-center bg-transparent focus:outline-none"
                    />
                    <span className="text-xs text-white/45">%</span>
                  </div>
                </div>
                {batteryBelowMin && (
                  <div className="mt-2 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                    <span className="material-symbols-outlined text-red-500 text-base">warning</span>
                    <span className="text-xs text-red-700 font-medium">Batería por debajo del mínimo ({quoterMinBattery}%)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block w-px bg-white/[0.08] self-stretch" />

            {/* Right: Result */}
            <div className="flex flex-col items-center justify-center text-center py-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-2">Valor Trade-in</p>
              {quoterPrice !== null ? (
                <p className="text-5xl font-black text-[#3eff8e] tabular-nums">${quoterPrice}<span className="text-lg font-bold text-white/45 ml-2">USD</span></p>
              ) : (
                <p className="text-2xl font-bold text-white/35">Sin precio</p>
              )}
              <p className="text-xs text-white/45 mt-2">
                {quoterModel} · Estado {quoterCondition} · {quoterBattery}%
              </p>

              <button
                onClick={openModalFromQuoter}
                className="mt-5 flex items-center gap-2 px-6 py-3 bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e] rounded-full font-bold text-sm  hover:brightness-95 transition-all"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                Registrar Trade-in
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ 3. Tabla de Cotización ============ */}
      <section className="mb-6">
        <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-emerald-400">swap_horiz</span>
            </div>
            <div>
              <h3 className="text-lg font-bold">Tabla de Cotización</h3>
              <p className="text-[11px] text-white/45">Referencia de precios para cotizar equipos en parte de pago</p>
            </div>
          </div>

          {tradeInTable.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/45">
              <span className="material-symbols-outlined text-4xl mb-3">swap_horiz</span>
              <p className="text-sm font-medium">No hay precios de trade-in cargados</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45 bg-white/[0.03]">Modelo</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-green-700 bg-green-50">Estado A — Impecable</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-amber-700 bg-amber-50">Estado B — Detalles</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-red-700 bg-red-50">Estado C — Uso visible</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45 bg-white/[0.03]">Batería mín.</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeInTable.map((row, i) => (
                    <tr key={row.model} className={`hover:bg-blue-50/40 transition-colors border-t border-white/[0.06] ${i % 2 === 1 ? "bg-white/[0.02]" : "bg-[#1a1a1d]"}`}>
                      <td className="px-6 py-4 text-sm font-bold">{row.model}</td>
                      <td className="px-4 py-4">
                        <span className="text-base font-black text-green-700">${row.a}</span>
                        <span className="text-[10px] text-white/45 ml-1">USD</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-base font-black text-amber-700">${row.b}</span>
                        <span className="text-[10px] text-white/45 ml-1">USD</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-base font-black text-red-600">${row.c}</span>
                        <span className="text-[10px] text-white/45 ml-1">USD</span>
                      </td>
                      <td className="px-4 py-4 w-36">
                        <BatteryBar value={row.bat} size="mini" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-blue-400 text-lg mt-0.5">smart_toy</span>
            <p className="text-xs text-blue-800 leading-relaxed">
              El agente IA usa esta tabla para cotizar equipos automáticamente. Cuando un cliente envía fotos, GPT Vision analiza el estado y cotiza según estos valores de referencia.
            </p>
          </div>
        </div>
      </section>

      {/* ============ 4. Historial ============ */}
      <section>
        <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 overflow-hidden">
          <div className="p-6 border-b border-white/[0.06]">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#3eff8e]/15 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-[#3eff8e]">history</span>
                </div>
                <h3 className="text-lg font-bold">Historial de Trade-ins</h3>
              </div>
              {/* Filter chips */}
              <div className="flex gap-2">
                {(
                  [
                    { key: "todos", label: "Todos" },
                    { key: "pendiente", label: "Pendiente" },
                    { key: "completado", label: "Completado" },
                    { key: "cancelado", label: "Cancelado" },
                  ] as { key: HistoryFilter; label: string }[]
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setHistoryFilter(f.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      historyFilter === f.key
                        ? "bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e]"
                        : "bg-white/[0.06] text-white/55 hover:bg-white/[0.08]"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-white/45">
              <span className="material-symbols-outlined text-3xl mb-2">swap_horiz</span>
              <p className="text-xs font-medium">
                {historyFilter === "todos" ? "Sin trade-ins registrados" : `Sin trade-ins con estado "${historyFilter}"`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="px-3 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45 w-8"></th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Fecha</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Cliente</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Modelo Recibido</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Condición</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Batería</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Precio</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Estado</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((t, i) => (
                    <>
                      <tr
                        key={t.id}
                        className={`hover:bg-blue-50/40 transition-colors border-t border-white/[0.06] cursor-pointer ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}
                        onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      >
                        <td className="px-3 py-4 text-center">
                          <span className={`material-symbols-outlined text-sm text-white/45 transition-transform inline-block ${expandedId === t.id ? "rotate-90" : ""}`}>
                            chevron_right
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm tabular-nums">
                          {new Date(t.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold">{t.client_name}</p>
                          {t.client_phone && <p className="text-[10px] text-white/45 mt-0.5">{t.client_phone}</p>}
                        </td>
                        <td className="px-4 py-4 text-sm font-bold">{t.model_received}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                            t.condition === "A" ? "bg-emerald-500/15 text-emerald-400" : t.condition === "B" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"
                          }`}>{t.condition}</span>
                        </td>
                        <td className="px-4 py-4 w-28">
                          <BatteryBar value={t.battery_health} size="mini" />
                        </td>
                        <td className="px-4 py-4 text-sm font-bold">{formatPrice(t.price_offered)}</td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 text-[10px] font-bold rounded-full ${
                            t.status === "completado"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : t.status === "cancelado"
                              ? "bg-red-500/15 text-red-400"
                              : "bg-amber-500/15 text-amber-400"
                          }`}>
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {/* Edit button */}
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/45 hover:text-[#3eff8e] transition-colors"
                              title="Editar"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>

                            {/* Status action buttons — only for pendiente */}
                            {t.status === "pendiente" && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(t.id, "completado")}
                                  className="p-1.5 rounded-lg hover:bg-green-50 text-white/45 hover:text-emerald-400 transition-colors"
                                  title="Completar (equipo recibido)"
                                >
                                  <span className="material-symbols-outlined text-base">check_circle</span>
                                </button>
                                <button
                                  onClick={() => handleStatusChange(t.id, "cancelado")}
                                  className="p-1.5 rounded-lg hover:bg-red-50 text-white/45 hover:text-red-600 transition-colors"
                                  title="Cancelar"
                                >
                                  <span className="material-symbols-outlined text-base">cancel</span>
                                </button>
                              </>
                            )}

                            {/* Delete — only for pendiente or cancelado */}
                            {(t.status === "pendiente" || t.status === "cancelado") && (
                              <button
                                onClick={() => setDeleteConfirmId(t.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-white/45 hover:text-red-600 transition-colors"
                                title="Eliminar"
                              >
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedId === t.id && (
                        <tr key={`${t.id}-detail`} className="bg-white/[0.03]/80">
                          <td colSpan={9} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1">Fecha y Hora</p>
                                <p className="font-medium">
                                  {new Date(t.created_at).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
                                  {" — "}
                                  {new Date(t.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                </p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1">Notas</p>
                                <p className="font-medium">{t.notes || "Sin notas"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1">Cotizado por</p>
                                <p className="font-medium text-white/45">—</p>
                              </div>
                              {t.status === "completado" && (
                                <div className="md:col-span-3">
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1">Producto vinculado</p>
                                  <button className="flex items-center gap-2 text-xs text-[#3eff8e] font-bold hover:underline">
                                    <span className="material-symbols-outlined text-sm">link</span>
                                    Vincular a producto
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ============ Add/Edit Modal ============ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => { setShowAddModal(false); setEditingId(null); }}>
          <div className="bg-[#1a1a1d] border border-white/[0.10] rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingId ? "Editar Trade-in" : "Registrar Trade-in"}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingId(null); }} className="text-white/45 hover:text-white/80">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Cliente *</label>
                <input required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Teléfono</label>
                <input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Modelo Recibido *</label>
                <input required value={form.model_received} onChange={(e) => setForm({ ...form, model_received: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30 focus:outline-none"
                  placeholder="iPhone 13 Pro" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Condición</label>
                  <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30 focus:outline-none">
                    <option value="A">A — Impecable</option>
                    <option value="B">B — Detalles</option>
                    <option value="C">C — Uso visible</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Batería %</label>
                  <input type="number" min={0} max={100} value={form.battery_health}
                    onChange={(e) => setForm({ ...form, battery_health: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Precio Ofrecido (USD)</label>
                <input type="number" step="0.01" value={form.price_offered}
                  onChange={(e) => setForm({ ...form, price_offered: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30 focus:outline-none resize-none"
                  rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setEditingId(null); }}
                  className="flex-1 py-3 bg-white/[0.08] rounded-full text-sm font-bold hover:bg-white/[0.10] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e] rounded-full text-sm font-bold  hover:brightness-95 transition-all disabled:opacity-50">
                  {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ Delete Confirmation Modal ============ */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setDeleteConfirmId(null)}>
          <div className="bg-[#1a1a1d] border border-white/[0.10] rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-2xl text-red-500">delete_forever</span>
              </div>
              <h3 className="text-lg font-bold mb-2">¿Eliminar trade-in?</h3>
              <p className="text-sm text-white/45 mb-6">Esta acción no se puede deshacer.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-3 bg-white/[0.08] rounded-full text-sm font-bold hover:bg-white/[0.10] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="flex-1 py-3 bg-red-500 text-white rounded-full text-sm font-bold hover:bg-red-600 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
    </div>
  );
}
