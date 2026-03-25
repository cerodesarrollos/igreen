"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ───── Types ───── */
interface Sale {
  id: string;
  product_id: string;
  sale_price: number;
  cost_price: number;
  sold_at: string;
}

interface Product {
  id: string;
  model: string;
  capacity: string;
  color: string;
  status: string;
  origin: string;
  condition: string | null;
  cost_price: number | null;
  sale_price: number | null;
  sold_at: string | null;
  created_at: string;
  warranty_until: string | null;
}

interface Expense {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  date: string;
  recurring: boolean;
  recurring_period: string | null;
  created_at: string;
  updated_at: string;
}

interface Warranty {
  id: string;
  sale_id: string | null;
  product_id: string | null;
  client_id: string | null;
  issue_description: string;
  resolution: string | null;
  cost: number;
  status: string;
  reported_at: string;
  resolved_at: string | null;
  created_at: string;
}

type PeriodKey = "7d" | "30d" | "90d" | "year";

/* ───── Helpers ───── */
function formatPrice(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })} USD`;
}

function daysBetween(a: string | Date, b: string | Date) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function getRange(period: PeriodKey): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let from: Date;
  switch (period) {
    case "7d":
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    case "30d":
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    case "90d":
      from = new Date(now);
      from.setDate(from.getDate() - 90);
      from.setHours(0, 0, 0, 0);
      break;
    case "year":
      from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;
    default:
      from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

const EXPENSE_CATEGORIES = ["Publicidad", "Empleados", "Sistema", "Comisiones", "Otros"];

const emptyExpenseForm = {
  category: "Otros",
  description: "" as string | null,
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  recurring: false,
  recurring_period: null as string | null,
};

/* ───── Component ───── */
/* ───── Instagram Insights Types ───── */
interface IgInsights {
  profile: { followers_count: number; media_count: number };
  metrics: {
    impressions?: number;
    reach: number;
    profile_views: number;
    website_clicks: number;
  };
  media: { id: string; caption?: string; media_type: string; media_url?: string; thumbnail_url?: string; timestamp: string; like_count: number; comments_count: number }[];
  error?: { message: string } | null;
}

export default function MetricasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [igInsights, setIgInsights] = useState<IgInsights | null>(null);
  const [igLoading, setIgLoading] = useState(false);

  const [period, setPeriod] = useState<PeriodKey>("30d");

  /* Expense CRUD */
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);

  const loadData = useCallback(async () => {
    const [salesRes, prodRes, expRes, warRes] = await Promise.all([
      supabase.from("ig_sales").select("*").order("sold_at", { ascending: false }),
      supabase.from("ig_products").select("*"),
      supabase.from("ig_expenses").select("*").order("date", { ascending: false }),
      supabase.from("ig_warranties").select("*").order("reported_at", { ascending: false }),
    ]);
    setSales((salesRes.data || []) as Sale[]);
    setProducts((prodRes.data || []) as Product[]);
    setExpenses((expRes.data || []) as Expense[]);
    setWarranties((warRes.data || []) as Warranty[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    async function loadIgInsights() {
      setIgLoading(true);
      try {
        const res = await fetch("/api/instagram/insights");
        const data = await res.json();
        setIgInsights(data);
      } catch (e) {
        console.error("Error cargando insights:", e);
      } finally {
        setIgLoading(false);
      }
    }
    loadIgInsights();
  }, []);

  /* ── Filtered data ── */
  const { from, to } = getRange(period);
  const fromStr = from.toISOString();
  const toStr = to.toISOString();
  const inRange = (d: string) => d >= fromStr && d <= toStr;

  const filteredSales = sales.filter((s) => inRange(s.sold_at));
  const filteredExpenses = expenses.filter((e) => inRange(e.date));

  const productMap = new Map(products.map((p) => [p.id, p]));

  /* ── KPIs ── */
  const totalSalesCount = filteredSales.length;
  const totalSalesAmount = filteredSales.reduce((s, x) => s + x.sale_price, 0);
  const grossProfit = filteredSales.reduce((s, x) => s + (x.sale_price - x.cost_price), 0);
  const avgTicket = totalSalesCount > 0 ? totalSalesAmount / totalSalesCount : 0;
  const avgMargin = totalSalesAmount > 0 ? (grossProfit / totalSalesAmount) * 100 : 0;

  /* Active warranties — products with warranty_until in the future */
  const now = new Date();
  const activeWarranties = products.filter(
    (p) => p.warranty_until && new Date(p.warranty_until) > now
  ).length;

  /* ── Revenue Chart (CSS bar chart) ── */
  function buildChartBuckets() {
    const buckets: { label: string; revenue: number }[] = [];
    const diffDays = daysBetween(from, to);

    if (diffDays <= 14) {
      // Daily
      const d = new Date(from);
      while (d <= to) {
        const key = d.toISOString().slice(0, 10);
        const rev = filteredSales
          .filter((s) => s.sold_at.slice(0, 10) === key)
          .reduce((s, x) => s + x.sale_price, 0);
        buckets.push({
          label: d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }),
          revenue: rev,
        });
        d.setDate(d.getDate() + 1);
      }
    } else if (diffDays <= 120) {
      // Weekly
      const d = new Date(from);
      let weekNum = 1;
      while (d <= to) {
        const weekEnd = new Date(d);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const wStart = d.toISOString();
        const wEnd = weekEnd.toISOString();
        const rev = filteredSales
          .filter((s) => s.sold_at >= wStart && s.sold_at <= wEnd)
          .reduce((s, x) => s + x.sale_price, 0);
        buckets.push({ label: `S${weekNum}`, revenue: rev });
        d.setDate(d.getDate() + 7);
        weekNum++;
      }
    } else {
      // Monthly
      const d = new Date(from.getFullYear(), from.getMonth(), 1);
      while (d <= to) {
        const y = d.getFullYear();
        const m = d.getMonth();
        const rev = filteredSales
          .filter((s) => {
            const sd = new Date(s.sold_at);
            return sd.getFullYear() === y && sd.getMonth() === m;
          })
          .reduce((s, x) => s + x.sale_price, 0);
        buckets.push({
          label: d.toLocaleDateString("es-AR", { month: "short" }),
          revenue: rev,
        });
        d.setMonth(d.getMonth() + 1);
      }
    }
    return buckets;
  }
  const chartData = buildChartBuckets();
  const maxChart = Math.max(...chartData.map((b) => b.revenue), 1);

  /* ── Top Models ── */
  const modelStats = new Map<string, { revenue: number; cost: number; count: number }>();
  filteredSales.forEach((s) => {
    const p = productMap.get(s.product_id);
    const model = p?.model || "Desconocido";
    const cur = modelStats.get(model) || { revenue: 0, cost: 0, count: 0 };
    cur.revenue += s.sale_price;
    cur.cost += s.cost_price;
    cur.count += 1;
    modelStats.set(model, cur);
  });
  const topModels = Array.from(modelStats.entries())
    .map(([model, d]) => ({
      model,
      units: d.count,
      revenue: d.revenue,
      margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 10);

  /* ── Warranty Section ── */
  const filteredWarranties = warranties.filter((w) => inRange(w.reported_at));
  const failureRate = totalSalesCount > 0 ? (filteredWarranties.length / totalSalesCount) * 100 : 0;

  const failsByModel = new Map<string, number>();
  filteredWarranties.forEach((w) => {
    const p = w.product_id ? productMap.get(w.product_id) : null;
    const model = p?.model || "Desconocido";
    failsByModel.set(model, (failsByModel.get(model) || 0) + 1);
  });
  const topFailModels = Array.from(failsByModel.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const avgDaysToFail = filteredWarranties.length > 0
    ? filteredWarranties.reduce((s, w) => {
        const sale = w.sale_id ? sales.find((sl) => sl.id === w.sale_id) : null;
        if (!sale) return s;
        return s + Math.max(0, daysBetween(sale.sold_at, w.reported_at));
      }, 0) / filteredWarranties.length
    : 0;

  /* ── Expense CRUD ── */
  const totalExpensesAmount = filteredExpenses.reduce((s, x) => s + x.amount, 0);

  async function saveExpense() {
    setSavingExpense(true);
    const payload = {
      category: expenseForm.category,
      description: expenseForm.description || null,
      amount: expenseForm.amount,
      date: expenseForm.date,
      recurring: expenseForm.recurring,
      recurring_period: expenseForm.recurring ? expenseForm.recurring_period : null,
    };
    if (editingExpenseId) {
      await supabase.from("ig_expenses").update(payload).eq("id", editingExpenseId);
    } else {
      await supabase.from("ig_expenses").insert(payload);
    }
    setExpenseForm({ ...emptyExpenseForm, date: new Date().toISOString().slice(0, 10) });
    setEditingExpenseId(null);
    setShowExpenseForm(false);
    setSavingExpense(false);
    loadData();
  }

  async function deleteExpense(id: string) {
    await supabase.from("ig_expenses").delete().eq("id", id);
    loadData();
  }

  function editExpense(e: Expense) {
    setExpenseForm({
      category: e.category,
      description: e.description,
      amount: e.amount,
      date: e.date,
      recurring: e.recurring,
      recurring_period: e.recurring_period,
    });
    setEditingExpenseId(e.id);
    setShowExpenseForm(true);
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3eff8e]" />
        <span className="ml-3 text-sm text-white/45">Cargando métricas...</span>
      </div>
    );
  }

  const periods: { key: PeriodKey; label: string }[] = [
    { key: "7d", label: "7 días" },
    { key: "30d", label: "30 días" },
    { key: "90d", label: "90 días" },
    { key: "year", label: "Este Año" },
  ];

  return (
    <div className="px-8 py-8 max-w-[1400px] mx-auto overflow-y-auto flex-1">
    <>
      {/* ── Chip Filters ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              period === p.key
                ? "bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e]"
                : "bg-white/[0.06] text-white/55 hover:bg-white/[0.08]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── KPI Cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Ventas del Mes", value: `${totalSalesCount} — ${formatPrice(totalSalesAmount)}`, icon: "sell", bg: "bg-blue-500/15", color: "text-blue-400" },
          { label: "Ticket Promedio", value: formatPrice(avgTicket), icon: "confirmation_number", bg: "bg-emerald-500/15", color: "text-emerald-400" },
          { label: "Margen Promedio %", value: `${avgMargin.toFixed(1)}%`, icon: "percent", bg: "bg-orange-100", color: "text-orange-600" },
          { label: "Garantías Activas", value: activeWarranties.toString(), icon: "verified_user", bg: "bg-[#3eff8e]/15", color: "text-[#3eff8e]" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-xl ${kpi.color}`}>{kpi.icon}</span>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1">{kpi.label}</p>
            <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </section>

      {/* ── Revenue Chart ── */}
      <section className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 p-6 mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-4">Ingresos por período</p>
        {chartData.every((b) => b.revenue === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/45">
            <span className="material-symbols-outlined text-4xl mb-3">bar_chart</span>
            <p className="text-sm font-medium">Sin datos de ventas para este período</p>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-1 h-48">
              {chartData.map((b, i) => (
                <div key={i} className="flex-1 min-w-[18px] flex flex-col items-center justify-end h-full gap-1">
                  <div
                    className="w-full bg-primary/80 hover:bg-primary rounded-t-md transition-colors"
                    style={{ height: `${(b.revenue / maxChart) * 100}%`, minHeight: b.revenue > 0 ? "4px" : "0" }}
                    title={formatPrice(b.revenue)}
                  />
                  <span className="text-[8px] text-white/45 whitespace-nowrap">{b.label}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3">
              <span className="flex items-center gap-1 text-xs text-white/45">
                <span className="w-3 h-3 rounded-sm bg-primary/80 inline-block" />
                Ingresos
              </span>
            </div>
          </>
        )}
      </section>

      {/* ── Top Models Table ── */}
      <section className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/45">Top Modelos</p>
        </div>
        {topModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/45">
            <span className="material-symbols-outlined text-4xl mb-3">phone_iphone</span>
            <p className="text-sm font-medium">Sin ventas en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.03]">
                  <th className="px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Modelo</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Unidades</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Ingresos</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Margen Prom.</th>
                </tr>
              </thead>
              <tbody>
                {topModels.map((m, i) => (
                  <tr
                    key={m.model}
                    className={`hover:bg-white/[0.03] transition-colors ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}
                  >
                    <td className="px-6 py-3 text-sm font-medium">{m.model}</td>
                    <td className="px-4 py-3 text-sm">{m.units}</td>
                    <td className="px-4 py-3 text-sm">{formatPrice(m.revenue)}</td>
                    <td className="px-4 py-3 text-sm">{m.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Warranty Section ── */}
      <section className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 p-6 mb-8">
        <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-4">Garantías</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/[0.03] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1">Activas</p>
            <p className="text-xl font-bold">{activeWarranties}</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1">Tasa Falla</p>
            <p className="text-xl font-bold">{failureRate.toFixed(1)}%</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1">Prom. Días a Falla</p>
            <p className="text-xl font-bold">{Math.round(avgDaysToFail)}d</p>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-1">Reclamos Período</p>
            <p className="text-xl font-bold">{filteredWarranties.length}</p>
          </div>
        </div>
        {topFailModels.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-2">Top Modelos con Falla</p>
            <div className="space-y-2">
              {topFailModels.map(([model, count]) => (
                <div key={model} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <span className="text-sm font-medium text-red-700">{model}</span>
                  <span className="px-2.5 py-0.5 bg-red-500/15 text-red-400 text-[10px] font-bold rounded-full">
                    {count} falla{count > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Expenses Section ── */}
      <section className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/45">Gastos Operativos</p>
          <button
            onClick={() => {
              setExpenseForm({ ...emptyExpenseForm, date: new Date().toISOString().slice(0, 10) });
              setEditingExpenseId(null);
              setShowExpenseForm(!showExpenseForm);
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e] rounded-full text-xs font-bold hover:brightness-95 transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Agregar
          </button>
        </div>

        {/* Inline form */}
        {showExpenseForm && (
          <div className="bg-white/[0.03] rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="border border-white/[0.08] rounded-xl px-3 py-2 text-sm bg-[#1a1a1d]"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Descripción"
                value={expenseForm.description || ""}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                className="border border-white/[0.08] rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Monto USD"
                value={expenseForm.amount || ""}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                className="border border-white/[0.08] rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="border border-white/[0.08] rounded-xl px-3 py-2 text-sm"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={expenseForm.recurring}
                  onChange={(e) => setExpenseForm({ ...expenseForm, recurring: e.target.checked })}
                  className="rounded"
                />
                Recurrente
              </label>
              {expenseForm.recurring && (
                <select
                  value={expenseForm.recurring_period || ""}
                  onChange={(e) => setExpenseForm({ ...expenseForm, recurring_period: e.target.value })}
                  className="border border-white/[0.08] rounded-xl px-3 py-2 text-sm bg-[#1a1a1d]"
                >
                  <option value="">Período</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensual">Mensual</option>
                  <option value="anual">Anual</option>
                </select>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveExpense}
                disabled={savingExpense || !expenseForm.amount}
                className="px-4 py-2 bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e] rounded-xl text-sm font-bold hover:brightness-95 transition-all disabled:opacity-50"
              >
                {savingExpense ? "Guardando..." : editingExpenseId ? "Actualizar" : "Guardar"}
              </button>
              <button
                onClick={() => { setShowExpenseForm(false); setEditingExpenseId(null); }}
                className="px-4 py-2 bg-white/[0.08] text-white/55 rounded-xl text-sm font-bold hover:bg-white/[0.10] transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/45">
            <span className="material-symbols-outlined text-4xl mb-3">receipt_long</span>
            <p className="text-sm font-medium">Sin gastos registrados para este período</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Categoría</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Descripción</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Monto</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Fecha</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45" />
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((e, i) => (
                    <tr key={e.id} className={`hover:bg-white/[0.03] transition-colors ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}>
                      <td className="px-6 py-3 text-sm">
                        <span className="px-2.5 py-0.5 bg-white/[0.06] text-white/55 text-[10px] font-bold rounded-full">{e.category}</span>
                        {e.recurring && (
                          <span className="ml-1.5 px-2 py-0.5 bg-blue-500/15 text-blue-400 text-[10px] font-bold rounded-full">↻ Recurrente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-white/50">{e.description || "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium">{formatPrice(e.amount)}</td>
                      <td className="px-4 py-3 text-sm text-white/50">{new Date(e.date).toLocaleDateString("es-AR")}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1">
                          <button onClick={() => editExpense(e)} className="p-1 hover:bg-white/[0.06] rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-sm text-white/45">edit</span>
                          </button>
                          <button onClick={() => deleteExpense(e.id)} className="p-1 hover:bg-red-50 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-sm text-red-400">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-between items-center">
              <span className="text-sm text-white/50 font-medium">Total del período</span>
              <span className="text-lg font-bold">{formatPrice(totalExpensesAmount)}</span>
            </div>
          </>
        )}
      </section>

      {/* ── Instagram Insights ── */}
      <section className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
            <span className="text-white text-xs font-bold">IG</span>
          </div>
          <h2 className="text-[10px] uppercase tracking-widest font-bold text-white/45">Instagram Insights — Últimos 30 días</h2>
        </div>

        {igLoading ? (
          <div className="flex items-center gap-3 py-8 justify-center text-white/45">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-400" />
            <span className="text-sm">Cargando datos de Instagram...</span>
          </div>
        ) : igInsights?.error ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl text-red-600 text-sm">
            <span className="material-symbols-outlined text-lg">error</span>
            Error al cargar insights: {igInsights.error.message}
          </div>
        ) : igInsights ? (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {[
                { label: "Seguidores", value: (igInsights.profile.followers_count ?? 0).toLocaleString("es-AR"), icon: "group", color: "text-[#3eff8e]", bg: "bg-[#3eff8e]/15" },
                { label: "Alcance 30d", value: (igInsights.metrics.reach ?? 0).toLocaleString("es-AR"), icon: "radar", color: "text-emerald-400", bg: "bg-emerald-500/15" },
                { label: "Visitas al perfil", value: (igInsights.metrics.profile_views ?? 0).toLocaleString("es-AR"), icon: "person_search", color: "text-pink-600", bg: "bg-pink-100" },
                { label: "Clicks al sitio", value: (igInsights.metrics.website_clicks ?? 0).toLocaleString("es-AR"), icon: "link", color: "text-orange-600", bg: "bg-orange-100" },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white/[0.03] rounded-xl p-4">
                  <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-2`}>
                    <span className={`material-symbols-outlined text-sm ${kpi.color}`}>{kpi.icon}</span>
                  </div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-white/45">{kpi.label}</p>
                  <p className="text-xl font-bold mt-0.5">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Últimos posts */}
            {igInsights.media.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-3">Últimas Publicaciones</p>
                <div className="grid grid-cols-3 lg:grid-cols-9 gap-2">
                  {igInsights.media.slice(0, 9).map((post) => (
                    <div key={post.id} className="relative group aspect-square rounded-xl overflow-hidden bg-white/[0.06]">
                      {post.media_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.thumbnail_url || post.media_url}
                          alt={post.caption?.slice(0, 30) || "post"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-white/35">image</span>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                        <span className="text-white text-xs font-bold">❤️ {post.like_count}</span>
                        <span className="text-white text-xs">💬 {post.comments_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : null}
      </section>
    </>
    </div>
  );
}
