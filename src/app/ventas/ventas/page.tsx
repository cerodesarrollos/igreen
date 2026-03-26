"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

/* ───── types ───── */
interface Sale {
  id: string;
  product_id: string | null;
  sale_price: number;
  cost_price: number;
  payment_method: string;
  warranty_days: number;
  warranty_until: string | null;
  notes: string | null;
  sold_at: string;
  client_name: string | null;
  client_last_name: string | null;
  client_phone: string | null;
  client_dni: string | null;
  client_email: string | null;
  product?: Product | null;
}

interface Product {
  id: string;
  model: string;
  brand: string;
  capacity: string | null;
  color: string | null;
  condition: string;
  battery_health: number | null;
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
  otro: "bg-white/[0.07] text-white/50",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);
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
  const daysLeft = Math.ceil((new Date(until).getTime() - Date.now()) / 86400000);
  if (daysLeft < 0) return { label: "Vencida", color: "text-red-400", icon: "warning" };
  if (daysLeft <= 15) return { label: `${daysLeft}d restantes`, color: "text-amber-400", icon: "timer" };
  return { label: `${daysLeft}d restantes`, color: "text-emerald-400", icon: "verified_user" };
}

type DateFilter = "todos" | "hoy" | "semana" | "mes";
type PaymentFilter = "todos" | "efectivo" | "transferencia" | "debito" | "credito" | "crypto";

/* ───── expanded detail ───── */
function SaleDetail({ s, docPreview, setDocPreview }: {
  s: Sale;
  docPreview: "ticket" | "garantia" | null;
  setDocPreview: (v: "ticket" | "garantia" | null) => void;
}) {
  const margin = s.sale_price - s.cost_price;
  const wStatus = warrantyStatus(s.warranty_until);
  const clientName = [s.client_name, s.client_last_name].filter(Boolean).join(" ");

  return (
    <tr className="border-b border-white/[0.05] bg-[#111113]">
      <td colSpan={7} className="px-6 py-5">
        <div className="grid grid-cols-3 gap-5">

          {/* Col 1 — Transacción */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-white/30 mb-3">Transacción</p>
            <div className="space-y-2.5">
              {[
                { l: "Precio de venta", v: formatMoney(s.sale_price), bold: true },
                { l: "Costo", v: formatMoney(s.cost_price) },
                { l: "Ganancia", v: formatMoney(margin), color: margin >= 0 ? "text-emerald-400" : "text-red-400", bold: true },
                { l: "Método de pago", v: PAYMENT_LABELS[s.payment_method] || s.payment_method, chip: true },
                { l: "Fecha", v: formatDate(s.sold_at) },
              ].map(({ l, v, bold, color, chip }) => (
                <div key={l} className="flex items-center justify-between gap-3">
                  <span className="text-[11px] text-white/40 whitespace-nowrap">{l}</span>
                  {chip ? (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${PAYMENT_COLORS[s.payment_method] || "bg-white/[0.07] text-white/50"}`}>{v}</span>
                  ) : (
                    <span className={`text-[12px] font-medium ${color || (bold ? "text-white/85" : "text-white/60")}`}>{v}</span>
                  )}
                </div>
              ))}
              {s.notes && (
                <div className="pt-2 border-t border-white/[0.05]">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 mb-1">Notas</p>
                  <p className="text-[11px] text-white/50 leading-relaxed">{s.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Col 2 — Equipo + Cliente */}
          <div className="space-y-4">
            {/* Equipo */}
            {s.product ? (
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-white/30 mb-3">Equipo</p>
                <div className="space-y-2.5">
                  {[
                    { l: "Modelo", v: `${s.product.brand} ${s.product.model}` },
                    { l: "Capacidad", v: s.product.capacity },
                    { l: "Color", v: s.product.color },
                    { l: "Condición", v: `Grado ${s.product.condition}` },
                    { l: "Batería", v: s.product.battery_health != null ? `${s.product.battery_health}%` : null },
                    { l: "IMEI", v: s.product.imei, mono: true },
                    { l: "Código", v: s.product.product_code, mono: true },
                  ].map(({ l, v, mono }) => v ? (
                    <div key={l} className="flex items-center justify-between gap-3">
                      <span className="text-[11px] text-white/40">{l}</span>
                      <span className={`text-[12px] font-medium text-white/70 ${mono ? "font-mono text-[11px]" : ""}`}>{v}</span>
                    </div>
                  ) : null)}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-white/30 mb-3">Equipo</p>
                <p className="text-[11px] text-white/30 italic">Producto eliminado</p>
              </div>
            )}

            {/* Cliente */}
            <div className="pt-3 border-t border-white/[0.05]">
              <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-white/30 mb-3">Cliente</p>
              {clientName ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white/50">{(s.client_name || "?").charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-white/80">{clientName}</p>
                      {s.client_dni && <p className="text-[10px] text-white/35">DNI {s.client_dni}</p>}
                    </div>
                  </div>
                  {s.client_phone && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px] text-white/25">phone</span>
                      <span className="text-[11px] text-white/50">{s.client_phone}</span>
                    </div>
                  )}
                  {s.client_email && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px] text-white/25">mail</span>
                      <span className="text-[11px] text-white/50">{s.client_email}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-white/30 italic">Sin datos de cliente</p>
              )}
            </div>
          </div>

          {/* Col 3 — Garantía + Documentos */}
          <div className="space-y-4">
            {/* Garantía */}
            <div>
              <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-white/30 mb-3">Garantía</p>
              {wStatus ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`material-symbols-outlined text-[16px] ${wStatus.color}`}>{wStatus.icon}</span>
                    <span className={`text-[12px] font-bold ${wStatus.color}`}>{wStatus.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/40">Cobertura</span>
                    <span className="text-[11px] text-white/60">{s.warranty_days} días</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-white/40">Vence</span>
                    <span className="text-[11px] text-white/60">{formatDate(s.warranty_until!)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-white/30 italic">Sin garantía</p>
              )}
            </div>

            {/* Documentos */}
            <div className="pt-3 border-t border-white/[0.05]">
              <p className="text-[9px] uppercase tracking-[0.14em] font-bold text-white/30 mb-3">Documentos</p>
              <div className="space-y-2">

                {/* Botón Recibo */}
                <button
                  onClick={() => setDocPreview(docPreview === "ticket" ? null : "ticket")}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                    docPreview === "ticket" ? "bg-white/[0.08] border-white/[0.15]" : "bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] text-white/40">receipt</span>
                  <span className="flex-1 text-[11px] font-bold text-white/70">Ver recibo de pago</span>
                  <span className={`material-symbols-outlined text-[14px] text-white/35 transition-transform ${docPreview === "ticket" ? "rotate-180" : ""}`}>expand_more</span>
                </button>

                {/* Preview Ticket */}
                {docPreview === "ticket" && (
                  <div className="rounded-xl overflow-hidden border border-white/[0.08]">
                    <div className="flex gap-2 p-2.5 bg-white/[0.04] border-b border-white/[0.06]">
                      <a href={`/ventas/print/ticket?sale_id=${s.id}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] rounded-lg text-[11px] font-bold text-white/65 transition-colors">
                        <span className="material-symbols-outlined text-[13px]">print</span>Imprimir
                      </a>
                      <a href={`/ventas/print/ticket?sale_id=${s.id}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] rounded-lg text-[11px] font-bold text-white/65 transition-colors">
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>Abrir
                      </a>
                    </div>
                    <div className="bg-white p-3 font-mono text-[8.5px] text-slate-700 leading-relaxed">
                      <p className="text-center text-slate-300">─────────────────</p>
                      <p className="text-center font-bold text-slate-900">🍏 iGreen</p>
                      <p className="text-center text-slate-500">Los Ríos 1774, CABA</p>
                      <p className="text-center text-slate-300">─────────────────</p>
                      <p className="text-center font-bold">GARANTÍA + RECIBO</p>
                      <p className="text-center text-slate-500">{formatDate(s.sold_at)}</p>
                      <p className="text-center text-slate-300">─────────────────</p>
                      {s.product && <><p className="font-bold text-slate-900">{s.product.brand} {s.product.model}</p>{s.product.imei && <p>IMEI: ••••{s.product.imei.slice(-4)}</p>}</>}
                      <p className="text-center text-slate-300">─────────────────</p>
                      {s.client_name && <p>Cliente: <span className="font-bold">{s.client_name}</span></p>}
                      <p>Garantía: {s.warranty_days}d</p>
                      <p className="text-center text-slate-300">─────────────────</p>
                      <div className="flex justify-between font-bold text-slate-900"><span>TOTAL:</span><span>{formatMoney(s.sale_price)}</span></div>
                      <p>{PAYMENT_LABELS[s.payment_method] || s.payment_method}</p>
                    </div>
                  </div>
                )}

                {/* Botón Garantía */}
                <button
                  onClick={() => setDocPreview(docPreview === "garantia" ? null : "garantia")}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all ${
                    docPreview === "garantia" ? "bg-white/[0.08] border-white/[0.15]" : "bg-white/[0.04] border-white/[0.07] hover:bg-white/[0.07]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px] text-white/40">verified_user</span>
                  <span className="flex-1 text-[11px] font-bold text-white/70">Ver garantía</span>
                  <span className={`material-symbols-outlined text-[14px] text-white/35 transition-transform ${docPreview === "garantia" ? "rotate-180" : ""}`}>expand_more</span>
                </button>

                {/* Preview Garantía */}
                {docPreview === "garantia" && (
                  <div className="rounded-xl overflow-hidden border border-white/[0.08]">
                    <div className="flex gap-2 p-2.5 bg-white/[0.04] border-b border-white/[0.06]">
                      <a href={`/ventas/print/garantia?sale_id=${s.id}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] rounded-lg text-[11px] font-bold text-white/65 transition-colors">
                        <span className="material-symbols-outlined text-[13px]">print</span>Imprimir
                      </a>
                      <a href={`/ventas/print/garantia?sale_id=${s.id}`} target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/[0.07] hover:bg-white/[0.12] border border-white/[0.1] rounded-lg text-[11px] font-bold text-white/65 transition-colors">
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>Abrir
                      </a>
                    </div>
                    <div className="bg-white p-3 text-[8.5px] text-slate-700 leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                      <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
                        <div><p className="font-bold text-slate-900">🍏 iGreen</p><p className="text-slate-400">Los Ríos 1774</p></div>
                        <div className="text-right"><p className="text-slate-400" style={{ fontSize: "7px" }}>CERTIFICADO DE GARANTÍA</p><p className="font-bold text-slate-900">{formatDate(s.sold_at)}</p></div>
                      </div>
                      {s.product && <div className="mb-1.5"><p className="font-bold text-slate-900">{s.product.brand} {s.product.model}</p>{s.product.imei && <p className="font-mono text-slate-500">{s.product.imei}</p>}</div>}
                      {s.client_name && <div className="mb-1.5"><p className="font-bold text-slate-900">{clientName}</p>{s.client_dni && <p className="text-slate-500">DNI {s.client_dni}</p>}</div>}
                      <div><p className="font-bold text-slate-900">{s.warranty_days} días de garantía</p>{s.warranty_until && <p className="text-slate-500">Vence: {formatDate(s.warranty_until)}</p>}</div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </td>
    </tr>
  );
}

/* ───── main component ───── */
export default function VentasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("todos");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [docPreview, setDocPreview] = useState<"ticket" | "garantia" | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: salesData } = await supabase.from("ig_sales").select("*").order("sold_at", { ascending: false });
      if (!salesData) { setSales([]); return; }

      const productIds = Array.from(new Set(salesData.map((s) => s.product_id).filter(Boolean)));
      const productsMap: Record<string, Product> = {};
      if (productIds.length > 0) {
        const { data: prods } = await supabase.from("ig_products").select("id, model, brand, capacity, color, condition, battery_health, imei, product_code, photos").in("id", productIds);
        if (prods) prods.forEach((p) => { productsMap[p.id] = p; });
      }
      setSales(salesData.map((s) => ({ ...s, product: s.product_id ? productsMap[s.product_id] ?? null : null })));
    } catch { setSales([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      if (paymentFilter !== "todos" && s.payment_method !== paymentFilter) return false;
      if (dateFilter !== "todos") {
        const sold = new Date(s.sold_at);
        if (dateFilter === "hoy" && sold.toDateString() !== now.toDateString()) return false;
        if (dateFilter === "semana" && sold < new Date(now.getTime() - 7 * 86400000)) return false;
        if (dateFilter === "mes" && (sold.getMonth() !== now.getMonth() || sold.getFullYear() !== now.getFullYear())) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const clientFull = `${s.client_name || ""} ${s.client_last_name || ""}`.toLowerCase();
        const productName = `${s.product?.brand || ""} ${s.product?.model || ""}`.toLowerCase();
        return clientFull.includes(q) || productName.includes(q) || (s.client_phone || "").includes(q) || (s.client_dni || "").includes(q) || (s.product?.imei || "").includes(q) || (s.product?.product_code || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [sales, search, dateFilter, paymentFilter]);

  const kpis = useMemo(() => {
    const now = new Date();
    const monthSales = sales.filter((s) => { const d = new Date(s.sold_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    return {
      totalMonth: monthSales.length,
      revenueMonth: monthSales.reduce((a, s) => a + s.sale_price, 0),
      marginMonth: monthSales.reduce((a, s) => a + (s.sale_price - s.cost_price), 0),
      todayCount: sales.filter((s) => new Date(s.sold_at).toDateString() === now.toDateString()).length,
    };
  }, [sales]);

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); setDocPreview(null); }
    else { setExpandedId(id); setDocPreview(null); }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
        <span className="ml-3 text-sm text-white/45">Cargando ventas...</span>
      </div>
    );
  }

  const kpiCards = [
    { label: "Ventas Este Mes", display: String(kpis.totalMonth), icon: "point_of_sale" },
    { label: "Recaudado", display: formatMoney(kpis.revenueMonth), icon: "payments" },
    { label: "Ganancia Neta", display: formatMoney(kpis.marginMonth), icon: "trending_up" },
    { label: "Hoy", display: String(kpis.todayCount), icon: "today" },
  ];

  const dateChips: { key: DateFilter; label: string }[] = [
    { key: "todos", label: "Todas" }, { key: "hoy", label: "Hoy" },
    { key: "semana", label: "Esta semana" }, { key: "mes", label: "Este mes" },
  ];
  const paymentChips: { key: PaymentFilter; label: string }[] = [
    { key: "todos", label: "Todos" }, { key: "efectivo", label: "Efectivo" },
    { key: "transferencia", label: "Transferencia" }, { key: "debito", label: "Débito" }, { key: "credito", label: "Crédito" },
  ];

  return (
    <div className="px-8 py-8 overflow-y-auto flex-1">

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-[18px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[17px] bg-[#161619] px-5 py-4 h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{k.label}</p>
                <span className="material-symbols-outlined text-[16px] text-white/15">{k.icon}</span>
              </div>
              <p className="text-[26px] font-medium leading-none tracking-tight text-white/90 mt-3">{k.display}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Main card */}
      <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
        <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_32px_-8px_rgba(0,0,0,0.6)] overflow-hidden">

          {/* Header */}
          <div className="p-6 border-b border-white/[0.06] space-y-4">
            <div className="relative max-w-sm">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/35 text-[18px]">search</span>
              <input
                className="w-full pl-11 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-white/20 placeholder:text-white/30"
                placeholder="Buscar por cliente, equipo, IMEI, DNI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {dateChips.map((c) => (
                <button key={c.key} onClick={() => setDateFilter(c.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${dateFilter === c.key ? "bg-white/[0.12] border border-white/[0.18] text-white/90" : "bg-white/[0.06] text-white/45 hover:bg-white/[0.08]"}`}>
                  {c.label}
                </button>
              ))}
              <div className="w-px bg-white/[0.08] mx-1" />
              {paymentChips.map((c) => (
                <button key={c.key} onClick={() => setPaymentFilter(c.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${paymentFilter === c.key ? "bg-white/[0.12] border border-white/[0.18] text-white/90" : "bg-white/[0.06] text-white/45 hover:bg-white/[0.08]"}`}>
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
                    const productName = s.product ? `${s.product.brand} ${s.product.model}${s.product.capacity ? ` ${s.product.capacity}` : ""}` : "Producto eliminado";
                    const isOpen = expandedId === s.id;

                    return (
                      <>
                        <tr
                          key={s.id}
                          onClick={() => toggleExpand(s.id)}
                          className={`cursor-pointer transition-colors border-b border-white/[0.04] ${
                            isOpen ? "bg-white/[0.05] border-b-0" : i % 2 === 0 ? "hover:bg-white/[0.03]" : "bg-white/[0.02] hover:bg-white/[0.04]"
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`material-symbols-outlined text-[14px] text-white/25 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>chevron_right</span>
                              <div>
                                <p className="text-sm font-bold text-white/90 truncate max-w-[160px]">{productName}</p>
                                {s.product?.product_code && <p className="text-[11px] text-white/35 font-mono">{s.product.product_code}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-white/75">{clientName}</p>
                            {s.client_phone && <p className="text-[11px] text-white/35">{s.client_phone}</p>}
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-bold text-white/90">{formatMoney(s.sale_price)}</p>
                          </td>
                          <td className="px-4 py-4 hidden md:table-cell">
                            <p className={`text-sm font-bold ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatMoney(margin)}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${PAYMENT_COLORS[s.payment_method] || "bg-white/[0.07] text-white/55"}`}>
                              {PAYMENT_LABELS[s.payment_method] || s.payment_method}
                            </span>
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell">
                            {wStatus ? (
                              <div className="flex items-center gap-1.5">
                                <span className={`material-symbols-outlined text-[14px] ${wStatus.color}`}>{wStatus.icon}</span>
                                <span className={`text-xs font-medium ${wStatus.color}`}>{wStatus.label}</span>
                              </div>
                            ) : <span className="text-xs text-white/30">—</span>}
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell">
                            <p className="text-xs text-white/50">{formatDate(s.sold_at)}</p>
                            <p className="text-[11px] text-white/30">{timeAgo(s.sold_at)}</p>
                          </td>
                        </tr>
                        {isOpen && (
                          <SaleDetail
                            key={`${s.id}-detail`}
                            s={s}
                            docPreview={docPreview}
                            setDocPreview={setDocPreview}
                          />
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 bg-white/[0.02] text-xs font-medium text-white/35 border-t border-white/[0.06] flex items-center justify-between">
            <span>{filtered.length} venta{filtered.length !== 1 ? "s" : ""}</span>
            <span className="text-white/25">Total filtrado: {formatMoney(filtered.reduce((a, s) => a + s.sale_price, 0))}</span>
          </div>

        </div>
      </div>
    </div>
  );
}
