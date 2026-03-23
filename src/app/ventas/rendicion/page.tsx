"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ───── Types ───── */
interface Product {
  id: string;
  model: string;
  capacity: string;
  color: string;
  status: string;
  origin: string;
  consignment_owner: string | null;
  cost_price: number | null;
  sale_price: number | null;
  sold_at: string | null;
  created_at: string;
}

interface Sale {
  id: string;
  product_id: string;
  sale_price: number;
  cost_price: number;
  sold_at: string;
  settled: boolean;
}

interface ConsignmentRecord {
  id: string;
  product_id: string;
  provider: string;
  sale_price: number;
  cost_price: number;
  profit: number;
  sold_at: string;
  settled: boolean;
  productLabel: string;
}

type PeriodKey = "todos" | "semana" | "mes" | "custom";

/* ───── Helpers ───── */
function formatPrice(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })} USD`;
}

function getRange(period: PeriodKey, customFrom?: string, customTo?: string): { from: Date; to: Date } | null {
  if (period === "todos") return null;
  const now = new Date();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let from: Date;
  switch (period) {
    case "semana":
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    case "mes":
      from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    case "custom":
      from = customFrom ? new Date(customFrom) : new Date(now.getFullYear(), now.getMonth(), 1);
      if (customTo) {
        to.setTime(new Date(customTo).getTime());
        to.setHours(23, 59, 59, 999);
      }
      break;
    default:
      from = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { from: from!, to };
}

/* ───── Component ───── */
export default function RendicionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>("todos");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  /* Liquidation modal */
  const [showModal, setShowModal] = useState(false);
  const [modalProvider, setModalProvider] = useState<string | null>(null);
  const [settling, setSettling] = useState(false);

  const loadData = useCallback(async () => {
    const [prodRes, salesRes] = await Promise.all([
      supabase.from("ig_products").select("*").eq("origin", "consignacion"),
      supabase.from("ig_sales").select("*").order("sold_at", { ascending: false }),
    ]);
    setProducts((prodRes.data || []) as Product[]);
    setSales((salesRes.data || []) as Sale[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="ml-3 text-sm text-cool-grey">Cargando rendición...</span>
      </div>
    );
  }

  /* ── Period filter ── */
  const range = getRange(period, customFrom, customTo);
  const inRange = (d: string) => {
    if (!range) return true;
    return d >= range.from.toISOString() && d <= range.to.toISOString();
  };

  /* ── Build consignment records ── */
  const productMap = new Map(products.map((p) => [p.id, p]));
  const consignmentSales: ConsignmentRecord[] = sales
    .filter((s) => {
      const p = productMap.get(s.product_id);
      return p && p.origin === "consignacion" && inRange(s.sold_at);
    })
    .map((s) => {
      const p = productMap.get(s.product_id)!;
      return {
        id: s.product_id,
        product_id: s.product_id,
        provider: p.consignment_owner || "Sin proveedor",
        sale_price: s.sale_price,
        cost_price: s.cost_price,
        profit: s.sale_price - s.cost_price,
        sold_at: s.sold_at,
        settled: (s as Sale & { settled?: boolean }).settled || false,
        productLabel: `${p.model} ${p.capacity} ${p.color}`,
      };
    });

  /* ── Owners / providers ── */
  const owners = Array.from(new Set(products.map((p) => p.consignment_owner).filter(Boolean))) as string[];

  const ownerSummaries = owners.map((owner) => {
    const owned = products.filter((p) => p.consignment_owner === owner);
    const enStock = owned.filter((p) => p.status === "disponible" || p.status === "reservado");
    const vendidos = consignmentSales.filter((r) => r.provider === owner);
    const totalOwed = vendidos.filter((r) => !r.settled).reduce((s, r) => s + r.cost_price, 0);
    const totalSold = vendidos.length;
    return { owner, enStock: enStock.length, totalSold, totalOwed };
  });

  /* ── KPIs ── */
  const stockCount = products.filter((p) => p.status === "disponible" || p.status === "reservado").length;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const soldThisMonth = sales.filter((s) => {
    const p = productMap.get(s.product_id);
    return p && p.origin === "consignacion" && s.sold_at >= monthStart;
  }).length;
  const totalProfit = consignmentSales.reduce((s, r) => s + r.profit, 0);
  const pendingAmount = consignmentSales.filter((r) => !r.settled).reduce((s, r) => s + r.cost_price, 0);

  /* ── Liquidation ── */
  const modalItems = modalProvider
    ? consignmentSales.filter((r) => r.provider === modalProvider && !r.settled)
    : [];

  async function handleSettle() {
    if (!modalProvider || modalItems.length === 0) return;
    setSettling(true);
    const ids = modalItems.map((r) => r.product_id);
    await supabase.from("ig_sales").update({ settled: true }).in("product_id", ids);
    setSettling(false);
    setShowModal(false);
    setModalProvider(null);
    loadData();
  }

  const periods: { key: PeriodKey; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "semana", label: "Esta Semana" },
    { key: "mes", label: "Este Mes" },
    { key: "custom", label: "Rango" },
  ];

  return (
    <>
      {/* ── Chip Filters ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              period === p.key
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
        {period === "custom" && (
          <div className="flex items-center gap-2 ml-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
            />
            <span className="text-xs text-slate-400">→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
            />
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Stock Consignación", value: stockCount.toString(), icon: "inventory_2", bg: "bg-purple-100", color: "text-purple-600" },
          { label: "Vendidos Mes", value: soldThisMonth.toString(), icon: "sell", bg: "bg-green-100", color: "text-green-600" },
          { label: "Ganancia Total", value: formatPrice(totalProfit), icon: "trending_up", bg: "bg-blue-100", color: "text-blue-600" },
          { label: "Pendiente Liquidar", value: formatPrice(pendingAmount), icon: "hourglass_top", bg: "bg-amber-100", color: "text-amber-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-xl ${kpi.color}`}>{kpi.icon}</span>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">{kpi.label}</p>
            <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </section>

      {/* ── Provider Summary Cards ── */}
      {ownerSummaries.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {ownerSummaries.map((o) => (
            <div key={o.owner} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-purple-700">{o.owner.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold">{o.owner}</h4>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">En Stock</p>
                  <p className="text-lg font-bold">{o.enStock}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Vendidos</p>
                  <p className="text-lg font-bold">{o.totalSold}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Adeudado</p>
                  <p className="text-lg font-bold text-amber-600">{formatPrice(o.totalOwed)}</p>
                </div>
              </div>
              <button
                onClick={() => { setModalProvider(o.owner); setShowModal(true); }}
                disabled={o.totalOwed === 0}
                className="w-full px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">price_check</span>
                Liquidar
              </button>
            </div>
          ))}
        </section>
      )}

      {/* ── Movements Table ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Movimientos</p>
        </div>
        {consignmentSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-3">account_balance</span>
            <p className="text-sm font-medium">Sin movimientos en este período</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Fecha</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Producto</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Venta</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Costo</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Ganancia</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Proveedor</th>
                  <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Estado</th>
                </tr>
              </thead>
              <tbody>
                {consignmentSales.map((r, i) => (
                  <tr
                    key={`${r.product_id}-${i}`}
                    className={`hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}
                  >
                    <td className="px-6 py-3 text-sm text-slate-500">
                      {new Date(r.sold_at).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">{r.productLabel}</td>
                    <td className="px-4 py-3 text-sm">{formatPrice(r.sale_price)}</td>
                    <td className="px-4 py-3 text-sm">{formatPrice(r.cost_price)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-600">{formatPrice(r.profit)}</td>
                    <td className="px-4 py-3 text-sm">{r.provider}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                          r.settled
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {r.settled ? "LIQUIDADO" : "PENDIENTE"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Liquidation Modal ── */}
      {showModal && modalProvider && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Liquidar — {modalProvider}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{modalItems.length} items pendientes</p>
              </div>
              <button
                onClick={() => { setShowModal(false); setModalProvider(null); }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-slate-400">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {modalItems.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No hay items pendientes de liquidación</p>
              ) : (
                <div className="space-y-3">
                  {modalItems.map((item, i) => (
                    <div
                      key={`${item.product_id}-${i}`}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.productLabel}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(item.sold_at).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                      <p className="text-sm font-bold">{formatPrice(item.cost_price)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-slate-500">Total a liquidar</span>
                <span className="text-xl font-bold">
                  {formatPrice(modalItems.reduce((s, r) => s + r.cost_price, 0))}
                </span>
              </div>
              <button
                onClick={handleSettle}
                disabled={settling || modalItems.length === 0}
                className="w-full px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {settling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Confirmar Liquidación
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
