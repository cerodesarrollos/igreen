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
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
        <span className="ml-3 text-sm text-white/45">Cargando rendición...</span>
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

  /* ── Owners ── */
  const owners = Array.from(new Set(products.map((p) => p.consignment_owner).filter(Boolean))) as string[];
  const ownerSummaries = owners.map((owner) => {
    const owned = products.filter((p) => p.consignment_owner === owner);
    const enStock = owned.filter((p) => p.status === "disponible" || p.status === "reservado");
    const vendidos = consignmentSales.filter((r) => r.provider === owner);
    const totalOwed = vendidos.filter((r) => !r.settled).reduce((s, r) => s + r.cost_price, 0);
    return { owner, enStock: enStock.length, totalSold: vendidos.length, totalOwed };
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
    { key: "todos",  label: "Todos"      },
    { key: "semana", label: "Esta Semana" },
    { key: "mes",    label: "Este Mes"   },
    { key: "custom", label: "Rango"      },
  ];

  return (
    <div className="px-8 py-8 overflow-y-auto flex-1">

      {/* ── Period chips ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              period === p.key
                ? "bg-white/[0.12] border border-white/[0.18] text-white/90"
                : "bg-white/[0.06] text-white/45 hover:bg-white/[0.08]"
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
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs focus:outline-none"
            />
            <span className="text-xs text-white/45">→</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Stock Consignación", value: stockCount.toString(),     icon: "inventory_2"   },
          { label: "Vendidos Mes",        value: soldThisMonth.toString(),  icon: "sell"          },
          { label: "Ganancia Total",      value: formatPrice(totalProfit),  icon: "trending_up"   },
          { label: "Pendiente Liquidar",  value: formatPrice(pendingAmount),icon: "hourglass_top" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-[18px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[17px] bg-[#161619] px-5 py-4 h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{kpi.label}</p>
                <span className="material-symbols-outlined text-[16px] text-white/15">{kpi.icon}</span>
              </div>
              <div className="mt-3">
                <p className="text-[22px] font-medium leading-none tracking-tight text-white/90">{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Provider Cards ── */}
      {ownerSummaries.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {ownerSummaries.map((o) => (
            <div key={o.owner} className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
              <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center">
                    <span className="text-sm font-bold text-white/60">{o.owner.charAt(0).toUpperCase()}</span>
                  </div>
                  <h4 className="text-sm font-bold">{o.owner}</h4>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/35">En Stock</p>
                    <p className="text-lg font-bold text-white/90">{o.enStock}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/35">Vendidos</p>
                    <p className="text-lg font-bold text-white/90">{o.totalSold}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/35">Adeudado</p>
                    <p className="text-lg font-bold text-white/90">{formatPrice(o.totalOwed)}</p>
                  </div>
                </div>
                {/* Liquidar button */}
                <button
                  onClick={() => { setModalProvider(o.owner); setShowModal(true); }}
                  disabled={o.totalOwed === 0}
                  className="w-full px-4 py-2 bg-white/[0.08] border border-white/[0.12] text-white/70 rounded-xl text-sm font-bold hover:bg-white/[0.11] transition-all disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">price_check</span>
                  Liquidar
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Movements Table ── */}
      <section className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] mb-8">
        <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_32px_-8px_rgba(0,0,0,0.6)] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <p className="text-[10px] uppercase tracking-widest font-bold text-white/45">Movimientos</p>
          </div>
          {consignmentSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/35">
              <span className="material-symbols-outlined text-4xl mb-3">account_balance</span>
              <p className="text-sm font-medium">Sin movimientos en este período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Fecha</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Producto</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Venta</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Costo</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Ganancia</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Proveedor</th>
                    <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-white/45">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {consignmentSales.map((r, i) => (
                    <tr
                      key={`${r.product_id}-${i}`}
                      className={`border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}
                    >
                      <td className="px-6 py-3 text-sm text-white/50">
                        {new Date(r.sold_at).toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-white/80">{r.productLabel}</td>
                      <td className="px-4 py-3 text-sm text-white/70">{formatPrice(r.sale_price)}</td>
                      <td className="px-4 py-3 text-sm text-white/70">{formatPrice(r.cost_price)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-white/80">{formatPrice(r.profit)}</td>
                      <td className="px-4 py-3 text-sm text-white/60">{r.provider}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                          r.settled
                            ? "bg-white/[0.07] border-white/[0.10] text-white/55"
                            : "bg-white/[0.05] border-white/[0.08] text-white/45"
                        }`}>
                          {r.settled ? "LIQUIDADO" : "PENDIENTE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Liquidation Modal ── */}
      {showModal && modalProvider && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161619] border border-white/[0.10] rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Liquidar — {modalProvider}</h3>
                <p className="text-xs text-white/45 mt-0.5">{modalItems.length} items pendientes</p>
              </div>
              <button
                onClick={() => { setShowModal(false); setModalProvider(null); }}
                className="p-2 hover:bg-white/[0.06] rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-white/45">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {modalItems.length === 0 ? (
                <p className="text-sm text-white/45 text-center py-8">No hay items pendientes de liquidación</p>
              ) : (
                <div className="space-y-3">
                  {modalItems.map((item, i) => (
                    <div key={`${item.product_id}-${i}`} className="flex items-center justify-between p-3 bg-white/[0.04] rounded-xl border border-white/[0.06]">
                      <div>
                        <p className="text-sm font-medium text-white/80">{item.productLabel}</p>
                        <p className="text-xs text-white/40">{new Date(item.sold_at).toLocaleDateString("es-AR")}</p>
                      </div>
                      <p className="text-sm font-bold text-white/85">{formatPrice(item.cost_price)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-white/50">Total a liquidar</span>
                <span className="text-xl font-bold text-white/90">
                  {formatPrice(modalItems.reduce((s, r) => s + r.cost_price, 0))}
                </span>
              </div>
              <button
                onClick={handleSettle}
                disabled={settling || modalItems.length === 0}
                className="w-full px-4 py-3 bg-white/[0.10] border border-white/[0.16] text-white/85 rounded-xl text-sm font-bold hover:bg-white/[0.13] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {settling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white/50" />
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
    </div>
  );
}
