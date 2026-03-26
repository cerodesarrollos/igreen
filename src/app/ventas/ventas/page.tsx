"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

/* ───── types ───── */
interface Sale {
  id: string;
  product_id: string | null;
  client_id: string | null;
  appointment_id: string | null;
  sale_price: number;
  cost_price: number;
  payment_method: string;
  warranty_days: number;
  warranty_until: string | null;
  trade_in_id: string | null;
  notes: string | null;
  sold_at: string;
  created_at: string;
  client_name: string | null;
  client_last_name: string | null;
  client_phone: string | null;
  client_dni: string | null;
  client_email: string | null;
  // joined
  product?: Product | null;
}

interface Product {
  id: string;
  model: string;
  brand: string;
  capacity: string | null;
  color: string | null;
  condition: string;
  imei: string | null;
  product_code: string | null;
  photos: string[];
}

/* ───── helpers ───── */
const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  debito: "Débito",
  credito: "Crédito",
  crypto: "Crypto",
  otro: "Otro",
};

const PAYMENT_COLORS: Record<string, string> = {
  efectivo: "bg-emerald-500/15 text-emerald-400",
  transferencia: "bg-blue-500/15 text-blue-400",
  debito: "bg-violet-500/15 text-violet-400",
  credito: "bg-amber-500/15 text-amber-400",
  crypto: "bg-orange-500/15 text-orange-400",
  otro: "bg-white/[0.08] text-white/50",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days}d`;
  return `hace ${Math.floor(days / 30)}mo`;
}

function warrantyStatus(until: string | null) {
  if (!until) return null;
  const now = new Date();
  const exp = new Date(until);
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
  if (daysLeft < 0) return { label: "Vencida", color: "text-red-400", icon: "warning" };
  if (daysLeft <= 15) return { label: `${daysLeft}d restantes`, color: "text-amber-400", icon: "timer" };
  return { label: `${daysLeft}d restantes`, color: "text-emerald-400", icon: "verified_user" };
}

type DateFilter = "todos" | "hoy" | "semana" | "mes";
type PaymentFilter = "todos" | "efectivo" | "transferencia" | "debito" | "credito" | "crypto";

/* ───── component ───── */
type DocPreview = "ticket" | "garantia" | null;

export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("todos");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todos");
  const [selected, setSelected] = useState<Sale | null>(null);
  const [docPreview, setDocPreview] = useState<DocPreview>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: salesData } = await supabase
        .from("ig_sales")
        .select("*")
        .order("sold_at", { ascending: false });

      if (!salesData) { setSales([]); return; }

      // Join products
      const productIds = Array.from(new Set(salesData.map((s) => s.product_id).filter(Boolean)));
      const productsMap: Record<string, Product> = {};

      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from("ig_products")
          .select("id, model, brand, capacity, color, condition, imei, product_code, photos")
          .in("id", productIds);
        if (prods) {
          prods.forEach((p) => { productsMap[p.id] = p; });
        }
      }

      const enriched = salesData.map((s) => ({
        ...s,
        product: s.product_id ? productsMap[s.product_id] ?? null : null,
      }));

      setSales(enriched);
    } catch {
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── filters ── */
  const filtered = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      if (paymentFilter !== "todos" && s.payment_method !== paymentFilter) return false;

      if (dateFilter !== "todos") {
        const sold = new Date(s.sold_at);
        if (dateFilter === "hoy") {
          if (sold.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === "semana") {
          const weekAgo = new Date(now.getTime() - 7 * 86400000);
          if (sold < weekAgo) return false;
        } else if (dateFilter === "mes") {
          if (sold.getMonth() !== now.getMonth() || sold.getFullYear() !== now.getFullYear()) return false;
        }
      }

      if (search) {
        const q = search.toLowerCase();
        const clientFull = `${s.client_name || ""} ${s.client_last_name || ""}`.toLowerCase();
        const productName = `${s.product?.brand || ""} ${s.product?.model || ""}`.toLowerCase();
        return (
          clientFull.includes(q) ||
          productName.includes(q) ||
          (s.client_phone || "").includes(q) ||
          (s.client_dni || "").includes(q) ||
          (s.product?.imei || "").includes(q) ||
          (s.product?.product_code || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [sales, search, dateFilter, paymentFilter]);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const now = new Date();
    const monthSales = sales.filter((s) => {
      const d = new Date(s.sold_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalRevenue = monthSales.reduce((a, s) => a + s.sale_price, 0);
    const totalMargin = monthSales.reduce((a, s) => a + (s.sale_price - s.cost_price), 0);
    const today = sales.filter((s) => new Date(s.sold_at).toDateString() === now.toDateString());
    return {
      totalMonth: monthSales.length,
      revenueMonth: totalRevenue,
      marginMonth: totalMargin,
      todayCount: today.length,
    };
  }, [sales]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
        <span className="ml-3 text-sm text-white/45">Cargando ventas...</span>
      </div>
    );
  }

  const kpiCards = [
    { label: "Ventas Este Mes", value: kpis.totalMonth, display: String(kpis.totalMonth), icon: "point_of_sale" },
    { label: "Recaudado", value: kpis.revenueMonth, display: formatMoney(kpis.revenueMonth), icon: "payments" },
    { label: "Ganancia Neta", value: kpis.marginMonth, display: formatMoney(kpis.marginMonth), icon: "trending_up" },
    { label: "Hoy", value: kpis.todayCount, display: String(kpis.todayCount), icon: "today" },
  ];

  const dateChips: { key: DateFilter; label: string }[] = [
    { key: "todos", label: "Todas" },
    { key: "hoy", label: "Hoy" },
    { key: "semana", label: "Esta semana" },
    { key: "mes", label: "Este mes" },
  ];

  const paymentChips: { key: PaymentFilter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "efectivo", label: "Efectivo" },
    { key: "transferencia", label: "Transferencia" },
    { key: "debito", label: "Débito" },
    { key: "credito", label: "Crédito" },
  ];

  return (
    <div className="px-8 py-8 overflow-y-auto flex-1">

      {/* ── KPIs ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-[18px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[17px] bg-[#161619] px-5 py-4 h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{k.label}</p>
                <span className="material-symbols-outlined text-[16px] text-white/15">{k.icon}</span>
              </div>
              <div className="mt-3">
                <p className="text-[26px] font-medium leading-none tracking-tight text-white/90">{k.display}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Main card ── */}
      <div className="flex gap-6">
        <div className={`rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] transition-all ${selected ? "flex-1 min-w-0" : "w-full"}`}>
          <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_32px_-8px_rgba(0,0,0,0.6)] overflow-hidden">

            {/* Header */}
            <div className="p-6 border-b border-white/[0.06] space-y-4">
              {/* Search */}
              <div className="relative max-w-sm">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/35 text-[18px]">search</span>
                <input
                  className="w-full pl-11 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-white/20 placeholder:text-white/30"
                  placeholder="Buscar por cliente, equipo, IMEI, DNI..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Chips */}
              <div className="flex flex-wrap gap-2">
                {dateChips.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setDateFilter(c.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      dateFilter === c.key
                        ? "bg-white/[0.12] border border-white/[0.18] text-white/90"
                        : "bg-white/[0.06] text-white/45 hover:bg-white/[0.08]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
                <div className="w-px bg-white/[0.08] mx-1" />
                {paymentChips.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setPaymentFilter(c.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      paymentFilter === c.key
                        ? "bg-white/[0.12] border border-white/[0.18] text-white/90"
                        : "bg-white/[0.06] text-white/45 hover:bg-white/[0.08]"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/40">
                <span className="material-symbols-outlined text-4xl mb-3">receipt_long</span>
                <p className="text-sm font-medium">No hay ventas para mostrar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.03]">
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Equipo</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Cliente</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Precio</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45 hidden md:table-cell">Ganancia</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Pago</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45 hidden lg:table-cell">Garantía</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45 hidden lg:table-cell">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s, i) => {
                      const wStatus = warrantyStatus(s.warranty_until);
                      const margin = s.sale_price - s.cost_price;
                      const clientName = [s.client_name, s.client_last_name].filter(Boolean).join(" ") || "Sin datos";
                      const productName = s.product
                        ? `${s.product.brand} ${s.product.model}${s.product.capacity ? ` ${s.product.capacity}` : ""}`
                        : "Producto eliminado";

                      return (
                        <tr
                          key={s.id}
                          onClick={() => { setSelected(selected?.id === s.id ? null : s); setDocPreview(null); }}
                          className={`cursor-pointer transition-colors border-b border-white/[0.04] last:border-0 ${
                            selected?.id === s.id
                              ? "bg-white/[0.06]"
                              : i % 2 === 0
                              ? "bg-transparent hover:bg-white/[0.03]"
                              : "bg-white/[0.02] hover:bg-white/[0.03]"
                          }`}
                        >
                          {/* Equipo */}
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-white/90 truncate max-w-[180px]">{productName}</p>
                            {s.product?.product_code && (
                              <p className="text-[11px] text-white/35 font-mono">{s.product.product_code}</p>
                            )}
                          </td>

                          {/* Cliente */}
                          <td className="px-4 py-4">
                            <p className="text-sm text-white/75">{clientName}</p>
                            {s.client_phone && (
                              <p className="text-[11px] text-white/35">{s.client_phone}</p>
                            )}
                          </td>

                          {/* Precio */}
                          <td className="px-4 py-4">
                            <p className="text-sm font-bold text-white/90">{formatMoney(s.sale_price)}</p>
                          </td>

                          {/* Ganancia */}
                          <td className="px-4 py-4 hidden md:table-cell">
                            <p className={`text-sm font-bold ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {formatMoney(margin)}
                            </p>
                          </td>

                          {/* Pago */}
                          <td className="px-4 py-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${PAYMENT_COLORS[s.payment_method] || "bg-white/[0.07] text-white/55"}`}>
                              {PAYMENT_LABELS[s.payment_method] || s.payment_method}
                            </span>
                          </td>

                          {/* Garantía */}
                          <td className="px-4 py-4 hidden lg:table-cell">
                            {wStatus ? (
                              <div className="flex items-center gap-1.5">
                                <span className={`material-symbols-outlined text-[14px] ${wStatus.color}`}>{wStatus.icon}</span>
                                <span className={`text-xs font-medium ${wStatus.color}`}>{wStatus.label}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-white/30">—</span>
                            )}
                          </td>

                          {/* Fecha */}
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <p className="text-xs text-white/50">{formatDate(s.sold_at)}</p>
                            <p className="text-[11px] text-white/30">{timeAgo(s.sold_at)}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div className="px-6 py-3 bg-white/[0.02] text-xs font-medium text-white/35 border-t border-white/[0.06] flex items-center justify-between">
              <span>{filtered.length} venta{filtered.length !== 1 ? "s" : ""}</span>
              <span className="text-white/25">
                Total filtrado: {formatMoney(filtered.reduce((a, s) => a + s.sale_price, 0))}
              </span>
            </div>
          </div>
        </div>

        {/* ── Detail Panel ── */}
        {selected && (
          <div className="w-[360px] flex-shrink-0 hidden lg:flex flex-col gap-4">

            {/* Header card */}
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
              <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-1">Transacción</p>
                    <h3 className="text-base font-bold text-white/90">
                      {selected.product
                        ? `${selected.product.brand} ${selected.product.model}`
                        : "Producto eliminado"}
                    </h3>
                    {selected.product?.product_code && (
                      <p className="text-xs text-white/35 font-mono mt-0.5">{selected.product.product_code}</p>
                    )}
                  </div>
                  <button onClick={() => setSelected(null)} className="text-white/35 hover:text-white/70 transition-colors">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                {/* Precio / Ganancia */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white/[0.04] rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-1">Precio venta</p>
                    <p className="text-xl font-bold text-white/90">{formatMoney(selected.sale_price)}</p>
                  </div>
                  <div className="bg-white/[0.04] rounded-xl p-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-1">Ganancia</p>
                    <p className={`text-xl font-bold ${selected.sale_price - selected.cost_price >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatMoney(selected.sale_price - selected.cost_price)}
                    </p>
                  </div>
                </div>

                {/* Detalles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                    <span className="text-xs text-white/45">Costo</span>
                    <span className="text-xs font-medium text-white/65">{formatMoney(selected.cost_price)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                    <span className="text-xs text-white/45">Método de pago</span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PAYMENT_COLORS[selected.payment_method] || "bg-white/[0.07] text-white/55"}`}>
                      {PAYMENT_LABELS[selected.payment_method] || selected.payment_method}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/[0.05]">
                    <span className="text-xs text-white/45">Fecha de venta</span>
                    <span className="text-xs font-medium text-white/65">{formatDate(selected.sold_at)}</span>
                  </div>
                  {selected.notes && (
                    <div className="py-2">
                      <span className="text-xs text-white/45">Notas</span>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">{selected.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Equipo */}
            {selected.product && (
              <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
                <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-4">Equipo</p>
                  <div className="space-y-2.5">
                    {[
                      { label: "Modelo", value: `${selected.product.brand} ${selected.product.model}` },
                      { label: "Capacidad", value: selected.product.capacity },
                      { label: "Color", value: selected.product.color },
                      { label: "Condición", value: selected.product.condition },
                      { label: "IMEI", value: selected.product.imei, mono: true },
                    ].map(({ label, value, mono }) =>
                      value ? (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-white/40">{label}</span>
                          <span className={`text-xs font-medium text-white/70 ${mono ? "font-mono" : ""}`}>{value}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Cliente */}
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
              <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6">
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-4">Cliente</p>
                {selected.client_name ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-white/[0.07] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-white/60">
                          {selected.client_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white/85">
                          {[selected.client_name, selected.client_last_name].filter(Boolean).join(" ")}
                        </p>
                        {selected.client_dni && (
                          <p className="text-xs text-white/40">DNI {selected.client_dni}</p>
                        )}
                      </div>
                    </div>
                    {selected.client_phone && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-white/30">phone</span>
                        <span className="text-xs text-white/60">{selected.client_phone}</span>
                      </div>
                    )}
                    {selected.client_email && (
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] text-white/30">mail</span>
                        <span className="text-xs text-white/60">{selected.client_email}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4 text-white/30">
                    <span className="material-symbols-outlined text-2xl mb-1">person_off</span>
                    <p className="text-xs">Sin datos de cliente</p>
                  </div>
                )}
              </div>
            </div>

            {/* Garantía */}
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
              <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6">
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-4">Garantía</p>
                {selected.warranty_until ? (() => {
                  const ws = warrantyStatus(selected.warranty_until)!;
                  return (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`material-symbols-outlined text-xl ${ws.color}`}>{ws.icon}</span>
                        <span className={`text-sm font-bold ${ws.color}`}>{ws.label}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Días cubiertos</span>
                        <span className="text-xs font-medium text-white/65">{selected.warranty_days} días</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-white/40">Vence</span>
                        <span className="text-xs font-medium text-white/65">{formatDate(selected.warranty_until)}</span>
                      </div>
                    </div>
                  );
                })() : (
                  <p className="text-xs text-white/35">Sin garantía registrada</p>
                )}
              </div>
            </div>

            {/* Documentos */}
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
              <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6">
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-4">Documentos</p>
                <div className="space-y-2.5">

                  {/* Botón Ticket */}
                  <button
                    onClick={() => setDocPreview(docPreview === "ticket" ? null : "ticket")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                      docPreview === "ticket"
                        ? "bg-white/[0.08] border-white/[0.15]"
                        : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/[0.07] flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-white/50">receipt</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white/80">Ver recibo de pago</p>
                      <p className="text-[10px] text-white/35">Ticket + resumen</p>
                    </div>
                    <span className={`material-symbols-outlined text-[16px] text-white/40 transition-transform ${docPreview === "ticket" ? "rotate-180" : ""}`}>expand_more</span>
                  </button>

                  {/* Preview Ticket */}
                  {docPreview === "ticket" && (
                    <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
                      {/* Acciones */}
                      <div className="flex gap-2 p-3 bg-white/[0.04] border-b border-white/[0.06]">
                        <a
                          href={`/ventas/print/ticket?sale_id=${selected.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.08] hover:bg-white/[0.13] border border-white/[0.1] rounded-xl text-[11px] font-bold text-white/70 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">print</span>
                          Imprimir
                        </a>
                        <a
                          href={`/ventas/print/ticket?sale_id=${selected.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.08] hover:bg-white/[0.13] border border-white/[0.1] rounded-xl text-[11px] font-bold text-white/70 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          Abrir
                        </a>
                      </div>
                      {/* Preview */}
                      <div className="bg-white p-4 font-mono text-[9px] text-slate-700 leading-relaxed">
                        <p className="text-center text-slate-300">─────────────────</p>
                        <p className="text-center font-bold text-slate-900 text-[11px]">🍏 iGreen</p>
                        <p className="text-center text-slate-500">Los Ríos 1774, CABA</p>
                        <p className="text-center text-slate-300">─────────────────</p>
                        <p className="text-center font-bold text-slate-900">GARANTÍA + RECIBO</p>
                        <p className="text-center text-slate-500">{formatDate(selected.sold_at)}</p>
                        <p className="text-center text-slate-300">─────────────────</p>
                        {selected.product && (
                          <>
                            <p className="font-bold text-slate-900">{selected.product.brand} {selected.product.model}</p>
                            {selected.product.capacity && <p>{selected.product.capacity}{selected.product.color ? ` · ${selected.product.color}` : ""}</p>}
                            {selected.product.imei && <p>IMEI: ••••{selected.product.imei.slice(-4)}</p>}
                          </>
                        )}
                        <p className="text-center text-slate-300">─────────────────</p>
                        {selected.client_name && <p>Cliente: <span className="font-bold">{selected.client_name}</span></p>}
                        <p>Garantía: {selected.warranty_days}d</p>
                        <p className="text-center text-slate-300">─────────────────</p>
                        <div className="flex justify-between font-bold text-slate-900 text-[10px] mt-1">
                          <span>TOTAL:</span>
                          <span>{formatMoney(selected.sale_price)}</span>
                        </div>
                        <p className="text-slate-600">{PAYMENT_LABELS[selected.payment_method] || selected.payment_method}</p>
                        <p className="text-center text-slate-300 mt-1">─────────────────</p>
                      </div>
                    </div>
                  )}

                  {/* Botón Garantía */}
                  <button
                    onClick={() => setDocPreview(docPreview === "garantia" ? null : "garantia")}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                      docPreview === "garantia"
                        ? "bg-white/[0.08] border-white/[0.15]"
                        : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white/[0.07] flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-white/50">verified_user</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white/80">Ver garantía</p>
                      <p className="text-[10px] text-white/35">Certificado formal A4</p>
                    </div>
                    <span className={`material-symbols-outlined text-[16px] text-white/40 transition-transform ${docPreview === "garantia" ? "rotate-180" : ""}`}>expand_more</span>
                  </button>

                  {/* Preview Garantía */}
                  {docPreview === "garantia" && (
                    <div className="rounded-2xl overflow-hidden border border-white/[0.08]">
                      {/* Acciones */}
                      <div className="flex gap-2 p-3 bg-white/[0.04] border-b border-white/[0.06]">
                        <a
                          href={`/ventas/print/garantia?sale_id=${selected.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.08] hover:bg-white/[0.13] border border-white/[0.1] rounded-xl text-[11px] font-bold text-white/70 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">print</span>
                          Imprimir
                        </a>
                        <a
                          href={`/ventas/print/garantia?sale_id=${selected.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/[0.08] hover:bg-white/[0.13] border border-white/[0.1] rounded-xl text-[11px] font-bold text-white/70 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          Abrir
                        </a>
                      </div>
                      {/* Preview */}
                      <div className="bg-white p-4 text-[9px] text-slate-700 leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                        <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-3">
                          <div>
                            <p className="font-bold text-slate-900 text-[11px]">🍏 iGreen</p>
                            <p className="text-slate-400">Los Ríos 1774, Recoleta</p>
                          </div>
                          <div className="text-right">
                            <p className="text-slate-400 uppercase tracking-wider" style={{ fontSize: "7px" }}>Certificado de Garantía</p>
                            <p className="font-bold text-slate-900 text-[10px]">{formatDate(selected.sold_at)}</p>
                          </div>
                        </div>
                        {selected.product && (
                          <div className="mb-2">
                            <p className="uppercase font-bold text-slate-400 mb-0.5" style={{ fontSize: "7px", letterSpacing: "0.12em" }}>EQUIPO</p>
                            <p className="font-bold text-slate-900 text-[10px]">{selected.product.brand} {selected.product.model}</p>
                            {selected.product.capacity && <p className="text-slate-500">{selected.product.capacity}{selected.product.color ? ` · ${selected.product.color}` : ""}</p>}
                            {selected.product.imei && <p className="text-slate-500 font-mono">{selected.product.imei}</p>}
                          </div>
                        )}
                        {selected.client_name && (
                          <div className="mb-2">
                            <p className="uppercase font-bold text-slate-400 mb-0.5" style={{ fontSize: "7px", letterSpacing: "0.12em" }}>CLIENTE</p>
                            <p className="font-bold text-slate-900 text-[10px]">{[selected.client_name, selected.client_last_name].filter(Boolean).join(" ")}</p>
                            {selected.client_dni && <p className="text-slate-500">DNI {selected.client_dni}</p>}
                          </div>
                        )}
                        <div>
                          <p className="uppercase font-bold text-slate-400 mb-0.5" style={{ fontSize: "7px", letterSpacing: "0.12em" }}>GARANTÍA</p>
                          <p className="font-bold text-slate-900 text-[10px]">{selected.warranty_days} días</p>
                          {selected.warranty_until && <p className="text-slate-500">Vence: {formatDate(selected.warranty_until)}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
