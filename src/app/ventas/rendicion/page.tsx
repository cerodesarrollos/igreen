"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

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
}

function formatPrice(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")} USD`;
}

export default function RendicionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"semana" | "mes">("mes");

  useEffect(() => {
    async function load() {
      const [prodRes, salesRes] = await Promise.all([
        supabase.from("ig_products").select("*").eq("origin", "consignacion"),
        supabase.from("ig_sales").select("*").order("sold_at", { ascending: false }),
      ]);
      setProducts((prodRes.data || []) as Product[]);
      setSales((salesRes.data || []) as Sale[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-sm text-cool-grey">Cargando rendición...</span>
      </div>
    );
  }

  /* Period filter */
  const now = new Date();
  const cutoff = new Date(now);
  if (period === "semana") cutoff.setDate(cutoff.getDate() - 7);
  else cutoff.setMonth(cutoff.getMonth() - 1);
  const cutoffStr = cutoff.toISOString();

  /* Consignment grouping by owner */
  const owners = Array.from(new Set(products.map((p) => p.consignment_owner).filter(Boolean))) as string[];

  const ownerSummaries = owners.map((owner) => {
    const owned = products.filter((p) => p.consignment_owner === owner);
    const enStock = owned.filter((p) => p.status === "disponible" || p.status === "reservado");
    const vendidos = owned.filter((p) => p.status === "vendido");

    // Match sales to vendidos
    const vendidoIds = new Set(vendidos.map((p) => p.id));
    const ownerSales = sales.filter((s) => vendidoIds.has(s.product_id));
    const salesInPeriod = ownerSales.filter((s) => s.sold_at >= cutoffStr);

    const totalCosto = vendidos.reduce((s, p) => s + (p.cost_price || 0), 0);
    const totalVenta = ownerSales.reduce((s, sa) => s + sa.sale_price, 0);
    const comision = totalVenta - totalCosto;

    const ventasPeriodo = salesInPeriod.reduce((s, sa) => s + sa.sale_price, 0);
    const costoPeriodo = salesInPeriod.reduce((s, sa) => s + sa.cost_price, 0);

    return {
      owner,
      totalEquipos: owned.length,
      enStock: enStock.length,
      vendidos: vendidos.length,
      totalCosto,
      totalVenta,
      comision,
      ventasPeriodo,
      comisionPeriodo: ventasPeriodo - costoPeriodo,
    };
  });

  const totalEnStock = ownerSummaries.reduce((s, o) => s + o.enStock, 0);
  const totalVendidos = ownerSummaries.reduce((s, o) => s + o.vendidos, 0);
  const totalComision = ownerSummaries.reduce((s, o) => s + o.comision, 0);

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rendición</h2>
          <p className="text-on-surface-variant text-sm mt-1">Liquidación de equipos en consignación</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPeriod("semana")}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${period === "semana" ? "bg-primary text-white" : "bg-slate-100 text-cool-grey hover:bg-slate-200"}`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod("mes")}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${period === "mes" ? "bg-primary text-white" : "bg-slate-100 text-cool-grey hover:bg-slate-200"}`}
          >
            Mes
          </button>
        </div>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: "En Consignación", value: totalEnStock.toString(), icon: "inventory_2", iconBg: "bg-purple-50", iconColor: "text-purple-600" },
          { label: "Vendidos", value: totalVendidos.toString(), icon: "sell", iconBg: "bg-green-50", iconColor: "text-green-600" },
          { label: "Ganancia Total", value: formatPrice(totalComision), icon: "trending_up", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 ${kpi.iconBg} rounded-lg`}>
                <span className={`material-symbols-outlined ${kpi.iconColor}`}>{kpi.icon}</span>
              </div>
            </div>
            <p className="text-on-surface-variant text-xs font-medium mb-1">{kpi.label}</p>
            <h3 className="text-2xl font-bold tracking-tight">{kpi.value}</h3>
          </div>
        ))}
      </section>

      {/* Owner summaries */}
      {ownerSummaries.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 flex flex-col items-center justify-center text-cool-grey">
          <span className="material-symbols-outlined text-4xl mb-3">account_balance</span>
          <p className="text-sm font-medium">No hay equipos en consignación</p>
        </div>
      ) : (
        <div className="space-y-6">
          {ownerSummaries.map((o) => (
            <div key={o.owner} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-purple-700">{o.owner.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{o.owner}</h3>
                    <p className="text-xs text-cool-grey">{o.totalEquipos} equipos totales</p>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-[10px] text-cool-grey uppercase font-bold mb-1">En Stock</p>
                  <p className="text-xl font-bold">{o.enStock}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-[10px] text-cool-grey uppercase font-bold mb-1">Vendidos</p>
                  <p className="text-xl font-bold">{o.vendidos}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl">
                  <p className="text-[10px] text-cool-grey uppercase font-bold mb-1">Total Venta</p>
                  <p className="text-xl font-bold">{formatPrice(o.totalVenta)}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-[10px] text-green-700 uppercase font-bold mb-1">Ganancia</p>
                  <p className="text-xl font-bold text-green-700">{formatPrice(o.comision)}</p>
                </div>
              </div>

              {o.comisionPeriodo !== 0 && (
                <div className="px-6 pb-6">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-800">
                      Período ({period === "semana" ? "última semana" : "último mes"}): Ventas {formatPrice(o.ventasPeriodo)} — Ganancia {formatPrice(o.comisionPeriodo)}
                    </p>
                  </div>
                </div>
              )}

              {/* Detail list of consignment products */}
              <div className="border-t border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Equipo</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Costo</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Venta</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {products.filter((p) => p.consignment_owner === o.owner).map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3 text-sm font-medium">{p.model} {p.capacity} {p.color}</td>
                          <td className="px-4 py-3 text-sm">{formatPrice(p.cost_price)}</td>
                          <td className="px-4 py-3 text-sm">{formatPrice(p.sale_price)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                              p.status === "vendido" ? "bg-slate-200 text-slate-600" : p.status === "reservado" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                            }`}>
                              {p.status === "vendido" ? "VENDIDO" : p.status === "reservado" ? "RESERVADO" : "DISPONIBLE"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
