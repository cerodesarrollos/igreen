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
  consignment_owner: string | null;
  condition: string | null;
  cost_price: number | null;
  sale_price: number | null;
  sold_at: string | null;
  created_at: string;
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

type PeriodKey = "hoy" | "semana" | "mes" | "anio" | "custom";

/* ───── Helpers ───── */
function formatPrice(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })} USD`;
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function daysBetween(a: string | Date, b: string | Date) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function periodLabel(p: PeriodKey) {
  return { hoy: "Hoy", semana: "Semana", mes: "Mes", anio: "Año", custom: "Custom" }[p];
}

/* ───── Period range calculator ───── */
function getRange(period: PeriodKey, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let from: Date;
  switch (period) {
    case "hoy":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "semana":
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    case "mes":
      from = new Date(now);
      from.setMonth(from.getMonth() - 1);
      from.setHours(0, 0, 0, 0);
      break;
    case "anio":
      from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
      from.setHours(0, 0, 0, 0);
      break;
    case "custom":
      from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
      if (customTo) {
        to.setTime(new Date(customTo).getTime());
        to.setHours(23, 59, 59, 999);
      }
      break;
    default:
      from = new Date(now);
      from.setMonth(from.getMonth() - 1);
  }
  return { from: from!, to };
}

function getPreviousRange(from: Date, to: Date): { from: Date; to: Date } {
  const diff = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - diff), to: new Date(from.getTime() - 1) };
}

const EXPENSE_CATEGORIES = ["Publicidad", "Empleados", "Sistema", "Comisiones", "Otros"];

const emptyExpenseForm: Omit<Expense, "id" | "created_at" | "updated_at"> = {
  category: "Otros",
  description: "",
  amount: 0,
  date: new Date().toISOString().slice(0, 10),
  recurring: false,
  recurring_period: null,
};

/* ───── Component ───── */
export default function MetricasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  // Expense CRUD
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

  /* ── Filtered data ── */
  const { from, to } = getRange(period, customFrom, customTo);
  const prev = getPreviousRange(from, to);
  const fromStr = from.toISOString();
  const toStr = to.toISOString();
  const prevFromStr = prev.from.toISOString();
  const prevToStr = prev.to.toISOString();

  const inRange = (d: string) => d >= fromStr && d <= toStr;
  const inPrev = (d: string) => d >= prevFromStr && d <= prevToStr;

  const filteredSales = sales.filter((s) => inRange(s.sold_at));
  const prevSales = sales.filter((s) => inPrev(s.sold_at));
  const filteredExpenses = expenses.filter((e) => inRange(e.date));
  const prevExpenses = expenses.filter((e) => inPrev(e.date));
  const filteredWarranties = warranties.filter((w) => inRange(w.reported_at));

  // Product map for lookups
  const productMap = new Map(products.map((p) => [p.id, p]));

  /* ── KPIs ── */
  const totalSalesCount = filteredSales.length;
  const totalSalesAmount = filteredSales.reduce((s, x) => s + x.sale_price, 0);
  const grossProfit = filteredSales.reduce((s, x) => s + (x.sale_price - x.cost_price), 0);
  const totalExpensesAmount = filteredExpenses.reduce((s, x) => s + x.amount, 0);
  const netProfit = grossProfit - totalExpensesAmount;

  const prevSalesAmount = prevSales.reduce((s, x) => s + x.sale_price, 0);
  const prevGross = prevSales.reduce((s, x) => s + (x.sale_price - x.cost_price), 0);
  const prevExpensesAmount = prevExpenses.reduce((s, x) => s + x.amount, 0);
  const prevNet = prevGross - prevExpensesAmount;

  /* ── Chart data ── */
  function buildChartBuckets() {
    const buckets: { label: string; sales: number; profit: number }[] = [];
    const diffDays = daysBetween(from, to);

    if (diffDays <= 1) {
      // Hours
      for (let h = 0; h < 24; h++) {
        buckets.push({ label: `${h}:00`, sales: 0, profit: 0 });
      }
      filteredSales.forEach((s) => {
        const h = new Date(s.sold_at).getHours();
        buckets[h].sales += s.sale_price;
        buckets[h].profit += s.sale_price - s.cost_price;
      });
    } else if (diffDays <= 31) {
      // Days
      const d = new Date(from);
      while (d <= to) {
        const key = d.toISOString().slice(0, 10);
        buckets.push({ label: d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }), sales: 0, profit: 0 });
        filteredSales.forEach((s) => {
          if (s.sold_at.slice(0, 10) === key) {
            buckets[buckets.length - 1].sales += s.sale_price;
            buckets[buckets.length - 1].profit += s.sale_price - s.cost_price;
          }
        });
        d.setDate(d.getDate() + 1);
      }
    } else {
      // Months
      const d = new Date(from.getFullYear(), from.getMonth(), 1);
      while (d <= to) {
        const y = d.getFullYear();
        const m = d.getMonth();
        buckets.push({
          label: d.toLocaleDateString("es-AR", { month: "short", year: "2-digit" }),
          sales: 0,
          profit: 0,
        });
        filteredSales.forEach((s) => {
          const sd = new Date(s.sold_at);
          if (sd.getFullYear() === y && sd.getMonth() === m) {
            buckets[buckets.length - 1].sales += s.sale_price;
            buckets[buckets.length - 1].profit += s.sale_price - s.cost_price;
          }
        });
        d.setMonth(d.getMonth() + 1);
      }
    }
    return buckets;
  }
  const chartData = buildChartBuckets();
  const maxChart = Math.max(...chartData.map((b) => b.sales), 1);

  /* ── Rentabilidad ── */
  const avgTicket = totalSalesCount > 0 ? totalSalesAmount / totalSalesCount : 0;
  const avgMargin = totalSalesAmount > 0 ? (grossProfit / totalSalesAmount) * 100 : 0;

  const modelProfits = new Map<string, { revenue: number; cost: number; count: number }>();
  filteredSales.forEach((s) => {
    const p = productMap.get(s.product_id);
    const model = p?.model || "Desconocido";
    const cur = modelProfits.get(model) || { revenue: 0, cost: 0, count: 0 };
    cur.revenue += s.sale_price;
    cur.cost += s.cost_price;
    cur.count += 1;
    modelProfits.set(model, cur);
  });
  const modelRanking = Array.from(modelProfits.entries())
    .map(([model, d]) => ({ model, profit: d.revenue - d.cost, margin: d.revenue > 0 ? ((d.revenue - d.cost) / d.revenue) * 100 : 0, count: d.count }))
    .sort((a, b) => b.profit - a.profit);

  const bestModel = modelRanking[0];
  const worstModel = modelRanking[modelRanking.length - 1];
  const top5 = modelRanking.slice(0, 5);

  /* ── Garantías ── */
  const warrantyPct = totalSalesCount > 0 ? (filteredWarranties.length / totalSalesCount) * 100 : 0;
  const warrantyCost = filteredWarranties.reduce((s, w) => s + w.cost, 0);

  // Fallas por modelo
  const failsByModel = new Map<string, number>();
  filteredWarranties.forEach((w) => {
    const p = w.product_id ? productMap.get(w.product_id) : null;
    const model = p?.model || "Desconocido";
    failsByModel.set(model, (failsByModel.get(model) || 0) + 1);
  });
  const failsTable = Array.from(failsByModel.entries()).map(([model, qty]) => {
    const soldQty = modelProfits.get(model)?.count || 0;
    return { model, qty, pct: soldQty > 0 ? (qty / soldQty) * 100 : 0 };
  }).sort((a, b) => b.qty - a.qty);

  const avgDaysToFail = filteredWarranties.length > 0
    ? filteredWarranties.reduce((s, w) => {
        const sale = w.sale_id ? sales.find((sl) => sl.id === w.sale_id) : null;
        if (!sale) return s;
        return s + Math.max(0, daysBetween(sale.sold_at, w.reported_at));
      }, 0) / filteredWarranties.length
    : 0;

  /* ── Inventario ── */
  const disponibles = products.filter((p) => p.status === "disponible");
  const vendidos = products.filter((p) => p.status === "vendido" && p.sold_at);

  const avgRotation = vendidos.length > 0
    ? vendidos.reduce((s, p) => s + daysBetween(p.created_at, p.sold_at!), 0) / vendidos.length
    : 0;

  const now = new Date();
  const stagnant = disponibles.filter((p) => daysBetween(p.created_at, now) > 30)
    .map((p) => ({ ...p, days: daysBetween(p.created_at, now) }))
    .sort((a, b) => b.days - a.days);

  const condA = disponibles.filter((p) => p.condition === "A").length;
  const condB = disponibles.filter((p) => p.condition === "B").length;
  const condC = disponibles.filter((p) => p.condition === "C").length;
  const maxCond = Math.max(condA, condB, condC, 1);

  /* ── Consignación ── */
  const propioSales = filteredSales.filter((s) => {
    const p = productMap.get(s.product_id);
    return p && p.origin === "propio";
  });
  const consigSales = filteredSales.filter((s) => {
    const p = productMap.get(s.product_id);
    return p && p.origin === "consignacion";
  });
  const propioProfit = propioSales.reduce((s, x) => s + (x.sale_price - x.cost_price), 0);
  const consigProfit = consigSales.reduce((s, x) => s + (x.sale_price - x.cost_price), 0);
  const propioMargin = propioSales.reduce((s, x) => s + x.sale_price, 0);
  const consigRevenue = consigSales.reduce((s, x) => s + x.sale_price, 0);

  /* ── Expense CRUD ── */
  async function saveExpense() {
    setSavingExpense(true);
    if (editingExpenseId) {
      await supabase.from("ig_expenses").update({
        category: expenseForm.category,
        description: expenseForm.description || null,
        amount: expenseForm.amount,
        date: expenseForm.date,
        recurring: expenseForm.recurring,
        recurring_period: expenseForm.recurring ? expenseForm.recurring_period : null,
      }).eq("id", editingExpenseId);
    } else {
      await supabase.from("ig_expenses").insert({
        category: expenseForm.category,
        description: expenseForm.description || null,
        amount: expenseForm.amount,
        date: expenseForm.date,
        recurring: expenseForm.recurring,
        recurring_period: expenseForm.recurring ? expenseForm.recurring_period : null,
      });
    }
    setExpenseForm(emptyExpenseForm);
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

  /* ── Badge helper ── */
  function CompareBadge({ current, previous }: { current: number; previous: number }) {
    const pct = pctChange(current, previous);
    if (pct === 0) return <span className="text-xs text-slate-400">—</span>;
    const up = pct > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? "text-green-600" : "text-red-500"}`}>
        <span className="material-symbols-outlined text-sm">{up ? "arrow_upward" : "arrow_downward"}</span>
        {Math.abs(pct)}%
      </span>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-sm text-cool-grey">Cargando métricas...</span>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Métricas</h2>
          <p className="text-on-surface-variant text-sm mt-1">Análisis de rendimiento del módulo de ventas</p>
        </div>

        {/* Period tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(["hoy", "semana", "mes", "anio", "custom"] as PeriodKey[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                period === p ? "bg-primary text-white" : "bg-slate-100 text-cool-grey hover:bg-slate-200"
              }`}
            >
              {periodLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date pickers */}
      {period === "custom" && (
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm"
          />
          <span className="self-center text-cool-grey text-sm">a</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="border border-slate-200 rounded-xl px-4 py-2 text-sm"
          />
        </div>
      )}

      {/* ══════ SECTION 1: KPIs ══════ */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Ventas Totales", value: `${totalSalesCount} — ${formatPrice(totalSalesAmount)}`, icon: "sell", iconBg: "bg-blue-50", iconColor: "text-blue-600", cur: totalSalesAmount, prev: prevSalesAmount },
          { label: "Ganancia Bruta", value: formatPrice(grossProfit), icon: "trending_up", iconBg: "bg-green-50", iconColor: "text-green-600", cur: grossProfit, prev: prevGross },
          { label: "Gastos Operativos", value: formatPrice(totalExpensesAmount), icon: "receipt_long", iconBg: "bg-orange-50", iconColor: "text-orange-600", cur: totalExpensesAmount, prev: prevExpensesAmount },
          { label: "Ganancia Neta", value: formatPrice(netProfit), icon: "account_balance", iconBg: "bg-purple-50", iconColor: "text-purple-600", cur: netProfit, prev: prevNet },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 ${kpi.iconBg} rounded-lg`}>
                <span className={`material-symbols-outlined ${kpi.iconColor}`}>{kpi.icon}</span>
              </div>
              <CompareBadge current={kpi.cur} previous={kpi.prev} />
            </div>
            <p className="text-on-surface-variant text-xs font-medium mb-1">{kpi.label}</p>
            <h3 className="text-xl font-bold tracking-tight">{kpi.value}</h3>
          </div>
        ))}
      </section>

      {/* ══════ SECTION 2: Gráfico de Ventas ══════ */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">Ventas y Ganancia</h3>
        {chartData.every((b) => b.sales === 0) ? (
          <EmptyState icon="bar_chart" text="Sin datos de ventas para este período" />
        ) : (
          <div className="flex items-end gap-1 h-48 overflow-x-auto">
            {chartData.map((b, i) => (
              <div key={i} className="flex-1 min-w-[24px] flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-40 relative">
                  <div
                    className="w-full bg-blue-100 rounded-t-md absolute bottom-0"
                    style={{ height: `${(b.sales / maxChart) * 100}%` }}
                  />
                  <div
                    className="w-full bg-green-400 rounded-t-md absolute bottom-0"
                    style={{ height: `${(b.profit / maxChart) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] text-cool-grey whitespace-nowrap">{b.label}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-4 mt-3">
          <span className="flex items-center gap-1 text-xs text-cool-grey"><span className="w-3 h-3 rounded-sm bg-blue-100 inline-block"></span>Ventas</span>
          <span className="flex items-center gap-1 text-xs text-cool-grey"><span className="w-3 h-3 rounded-sm bg-green-400 inline-block"></span>Ganancia</span>
        </div>
      </section>

      {/* ══════ SECTION 3: Rentabilidad ══════ */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">Rentabilidad</h3>
        {totalSalesCount === 0 ? (
          <EmptyState icon="analytics" text="Sin datos de ventas para este período" />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MiniKpi label="Ticket Promedio" value={formatPrice(avgTicket)} />
              <MiniKpi label="Margen Promedio" value={`${avgMargin.toFixed(1)}%`} />
              <MiniKpi label="Más Rentable" value={bestModel?.model || "—"} sub={bestModel ? formatPrice(bestModel.profit) : ""} />
              <MiniKpi label="Menos Rentable" value={worstModel?.model || "—"} sub={worstModel ? formatPrice(worstModel.profit) : ""} />
            </div>
            {top5.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Modelo</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Vendidos</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Ganancia</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {top5.map((m) => (
                      <tr key={m.model} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{m.model}</td>
                        <td className="px-4 py-3 text-sm">{m.count}</td>
                        <td className="px-4 py-3 text-sm">{formatPrice(m.profit)}</td>
                        <td className="px-4 py-3 text-sm">{m.margin.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* ══════ SECTION 4: Garantías / Calidad ══════ */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">Garantías / Calidad</h3>
        {filteredWarranties.length === 0 && totalSalesCount === 0 ? (
          <EmptyState icon="verified" text="Sin datos de garantías para este período" />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <MiniKpi label="% Garantías" value={`${warrantyPct.toFixed(1)}%`} />
              <MiniKpi label="Costo Total" value={formatPrice(warrantyCost)} />
              <MiniKpi label="Garantías Activas" value={filteredWarranties.length.toString()} />
              <MiniKpi label="Prom. días hasta falla" value={`${Math.round(avgDaysToFail)} días`} />
            </div>
            {failsTable.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Modelo</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Fallas</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">% sobre ventas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {failsTable.map((f) => (
                      <tr key={f.model} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{f.model}</td>
                        <td className="px-4 py-3 text-sm">{f.qty}</td>
                        <td className="px-4 py-3 text-sm">{f.pct.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* ══════ SECTION 5: Inventario ══════ */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">Inventario</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <MiniKpi label="Rotación Promedio" value={`${Math.round(avgRotation)} días`} />
          <MiniKpi label="Equipos Estancados (+30d)" value={stagnant.length.toString()} />
          <MiniKpi label="Stock Disponible" value={disponibles.length.toString()} />
        </div>

        {/* Condition bars */}
        <div className="mb-6 space-y-3">
          <p className="text-xs font-bold text-cool-grey uppercase tracking-widest mb-2">Stock por Condición</p>
          {[
            { label: "A — Impecable", count: condA, color: "bg-green-500" },
            { label: "B — Detalles menores", count: condB, color: "bg-yellow-500" },
            { label: "C — Uso visible", count: condC, color: "bg-red-400" },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-3">
              <span className="text-xs w-36 text-cool-grey">{c.label}</span>
              <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${c.color} rounded-full transition-all`} style={{ width: `${(c.count / maxCond) * 100}%` }} />
              </div>
              <span className="text-xs font-bold w-8 text-right">{c.count}</span>
            </div>
          ))}
        </div>

        {/* Stagnant list */}
        {stagnant.length > 0 && (
          <>
            <p className="text-xs font-bold text-cool-grey uppercase tracking-widest mb-2">Equipos Estancados</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Equipo</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Días</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stagnant.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">{p.model} {p.capacity} {p.color}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-0.5 bg-red-50 text-red-600 text-xs font-bold rounded-full">{p.days}d</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatPrice(p.sale_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ══════ SECTION 6: Gastos Operativos ══════ */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Gastos Operativos</h3>
          <button
            onClick={() => { setExpenseForm(emptyExpenseForm); setEditingExpenseId(null); setShowExpenseForm(!showExpenseForm); }}
            className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-bold hover:brightness-95 transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Agregar
          </button>
        </div>

        {/* Inline form */}
        {showExpenseForm && (
          <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
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
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
              />
              <input
                type="number"
                placeholder="Monto USD"
                value={expenseForm.amount || ""}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
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
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
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
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:brightness-95 transition-all disabled:opacity-50"
              >
                {savingExpense ? "Guardando..." : editingExpenseId ? "Actualizar" : "Guardar"}
              </button>
              <button
                onClick={() => { setShowExpenseForm(false); setEditingExpenseId(null); }}
                className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-300 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {filteredExpenses.length === 0 ? (
          <EmptyState icon="receipt_long" text="Sin gastos registrados para este período" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Categoría</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Descripción</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Monto</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Fecha</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">{e.category}</span>
                        {e.recurring && <span className="ml-1 text-[10px] text-blue-500 font-bold">↻</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-cool-grey">{e.description || "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium">{formatPrice(e.amount)}</td>
                      <td className="px-4 py-3 text-sm text-cool-grey">{new Date(e.date).toLocaleDateString("es-AR")}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-1">
                          <button onClick={() => editExpense(e)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                            <span className="material-symbols-outlined text-sm text-cool-grey">edit</span>
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
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-sm text-cool-grey font-medium">Total del período</span>
              <span className="text-lg font-bold">{formatPrice(totalExpensesAmount)}</span>
            </div>
          </>
        )}
      </section>

      {/* ══════ SECTION 7: Consignación ══════ */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h3 className="text-lg font-bold mb-4">Propios vs Consignación</h3>
        {totalSalesCount === 0 ? (
          <EmptyState icon="compare_arrows" text="Sin datos de ventas para este período" />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-xl p-5">
              <p className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-3">Propios</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm text-blue-700">Cantidad</span><span className="text-sm font-bold">{propioSales.length}</span></div>
                <div className="flex justify-between"><span className="text-sm text-blue-700">Ganancia</span><span className="text-sm font-bold">{formatPrice(propioProfit)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-blue-700">Margen</span><span className="text-sm font-bold">{propioMargin > 0 ? ((propioProfit / propioMargin) * 100).toFixed(1) : 0}%</span></div>
              </div>
            </div>
            <div className="bg-purple-50 rounded-xl p-5">
              <p className="text-xs font-bold text-purple-800 uppercase tracking-widest mb-3">Consignación</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-sm text-purple-700">Cantidad</span><span className="text-sm font-bold">{consigSales.length}</span></div>
                <div className="flex justify-between"><span className="text-sm text-purple-700">Ganancia</span><span className="text-sm font-bold">{formatPrice(consigProfit)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-purple-700">Margen</span><span className="text-sm font-bold">{consigRevenue > 0 ? ((consigProfit / consigRevenue) * 100).toFixed(1) : 0}%</span></div>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

/* ── Shared mini components ── */
function MiniKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl">
      <p className="text-[10px] text-cool-grey uppercase font-bold mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
      {sub && <p className="text-xs text-cool-grey">{sub}</p>}
    </div>
  );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-cool-grey">
      <span className="material-symbols-outlined text-4xl mb-3">{icon}</span>
      <p className="text-sm font-medium">{text}</p>
    </div>
  );
}
