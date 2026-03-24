"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string | null;
  created_at: string;
}

interface Appointment {
  id: string;
  client_name: string;
  phone: string;
  product_id: string | null;
  scheduled_at: string;
  status: string;
  notes: string | null;
}

function formatPrice(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")}`;
}

function formatDate() {
  return new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

export default function VentasResumenPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    disponibles: 0,
    reservados: 0,
    ventasMes: 0,
    gananciaMes: 0,
    ticketProm: 0,
    valorStock: 0,
  });
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [alerts, setAlerts] = useState<{ text: string; type: "warning" | "danger" | "info"; link: string }[]>([]);
  const [turnosHoy, setTurnosHoy] = useState<Appointment[]>([]);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const monthStr = now.toISOString().slice(0, 7);

      const [prodRes, salesRes, actRes, aptRes, warrantyRes] = await Promise.all([
        supabase.from("ig_products").select("*"),
        supabase.from("ig_sales").select("*"),
        supabase.from("ig_activity_log").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("ig_appointments").select("*").gte("scheduled_at", todayStr + "T00:00:00").lte("scheduled_at", todayStr + "T23:59:59").order("scheduled_at", { ascending: true }),
        supabase.from("ig_warranties").select("id, status"),
      ]);

      const products = (prodRes.data || []) as { status: string; sale_price: number | null; cost_price: number | null; battery_health: number; model: string; created_at: string }[];
      const salesData = (salesRes.data || []) as { sold_at: string; created_at: string; sale_price: number; cost_price: number }[];
      const warranties = (warrantyRes.data || []) as { id: string; status: string }[];

      const disponibles = products.filter((p) => p.status === "disponible").length;
      const reservados = products.filter((p) => p.status === "reservado").length;
      const ventasMes = salesData.filter((s) => (s.sold_at || s.created_at).startsWith(monthStr));
      const ventasMesCount = ventasMes.length;
      const gananciaMes = ventasMes.reduce((sum, s) => sum + ((s.sale_price || 0) - (s.cost_price || 0)), 0);
      const ticketProm = ventasMesCount > 0 ? ventasMes.reduce((sum, s) => sum + (s.sale_price || 0), 0) / ventasMesCount : 0;
      const valorStock = products.filter((p) => p.status === "disponible").reduce((s, p) => s + (p.sale_price || 0), 0);

      setKpis({ disponibles, reservados, ventasMes: ventasMesCount, gananciaMes, ticketProm, valorStock });
      setActivity((actRes.data || []) as ActivityLog[]);
      setTurnosHoy((aptRes.data || []) as Appointment[]);

      const alertList: { text: string; type: "warning" | "danger" | "info"; link: string }[] = [];
      const lowBattery = products.filter((p) => p.status === "disponible" && p.battery_health < 80);
      if (lowBattery.length > 0) alertList.push({ text: `${lowBattery.length} equipo(s) con batería < 80%`, type: "warning", link: "/ventas/stock" });
      const stale = products.filter((p) => {
        if (p.status !== "disponible") return false;
        return (Date.now() - new Date(p.created_at).getTime()) / 86400000 > 30;
      });
      if (stale.length > 0) alertList.push({ text: `${stale.length} equipo(s) sin vender hace +30 días`, type: "danger", link: "/ventas/metricas" });
      const openWarranties = warranties.filter((w) => w.status === "abierta");
      if (openWarranties.length > 0) alertList.push({ text: `${openWarranties.length} garantía(s) abierta(s)`, type: "warning", link: "/ventas/metricas" });
      if (disponibles === 0) alertList.push({ text: "Sin stock disponible", type: "danger", link: "/ventas/stock" });
      else if (disponibles <= 3) alertList.push({ text: `Stock bajo — solo ${disponibles} equipo(s)`, type: "warning", link: "/ventas/stock" });
      if (alertList.length === 0) alertList.push({ text: "Todo en orden", type: "info", link: "#" });

      setAlerts(alertList);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-violet-500 border-t-transparent" />
        <span className="ml-3 text-sm text-slate-500">Cargando...</span>
      </div>
    );
  }

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pendiente:  { label: "Pendiente",  color: "bg-slate-700 text-slate-300" },
      confirmado: { label: "Confirmado", color: "bg-violet-500/20 text-violet-400" },
      completado: { label: "Completado", color: "bg-emerald-500/20 text-emerald-400" },
      "no-show":  { label: "No asistió", color: "bg-red-500/20 text-red-400" },
    };
    return map[s] || { label: s, color: "bg-slate-700 text-slate-300" };
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500 capitalize mb-0.5">{formatDate()}</p>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Resumen de ventas y operaciones</p>
        </div>
        <Link
          href="/ventas/stock"
          className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Agregar equipo
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Disponibles",    value: kpis.disponibles.toString(),    icon: "phone_iphone",         link: "/ventas/stock",    trend: null },
          { label: "Reservados",     value: kpis.reservados.toString(),     icon: "schedule",             link: "/ventas/turnos",   trend: null },
          { label: "Ventas del mes", value: kpis.ventasMes.toString(),      icon: "sell",                 link: "/ventas/metricas", trend: "+15%" },
          { label: "Ganancia",       value: formatPrice(kpis.gananciaMes),  icon: "trending_up",          link: "/ventas/metricas", trend: "+8%"  },
          { label: "Ticket prom.",   value: formatPrice(kpis.ticketProm),   icon: "receipt_long",         link: "/ventas/metricas", trend: null },
          { label: "Valor stock",    value: formatPrice(kpis.valorStock),   icon: "account_balance_wallet",link: "/ventas/stock",   trend: null },
        ].map((k) => (
          <Link
            key={k.label}
            href={k.link}
            className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-4 hover:border-violet-500/30 hover:bg-[#22253a] transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="material-symbols-outlined text-slate-500 text-[18px] group-hover:text-violet-400 transition-colors"
                style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
              >
                {k.icon}
              </span>
              {k.trend && (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">
                  {k.trend}
                </span>
              )}
            </div>
            <p className="text-xl font-black text-white tracking-tight">{k.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wider">{k.label}</p>
          </Link>
        ))}
      </div>

      {/* Fila 2 — Turnos + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Turnos */}
        <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Turnos de hoy</h3>
            <Link href="/ventas/turnos" className="text-[10px] font-semibold text-violet-400 hover:text-violet-300 uppercase tracking-wider transition-colors">
              Ver todos →
            </Link>
          </div>
          {turnosHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <span className="material-symbols-outlined text-slate-600 text-3xl mb-2">event_available</span>
              <p className="text-xs text-slate-500">Sin turnos para hoy</p>
            </div>
          ) : (
            <div className="space-y-1">
              {turnosHoy.map((t) => {
                const st = statusLabel(t.status);
                return (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    <p className="text-sm font-bold text-violet-400 min-w-[44px]">
                      {new Date(t.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{t.client_name}</p>
                      {t.notes && <p className="text-[10px] text-slate-500 truncate">{t.notes}</p>}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${st.color}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Alertas</h3>
            <span className="text-[10px] font-bold text-slate-500 bg-[#2a2d3e] px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          </div>
          <div className="space-y-1">
            {alerts.map((alert, i) => {
              const styles = {
                warning: { dot: "bg-amber-400", text: "text-amber-300", bg: "hover:bg-amber-400/5" },
                danger:  { dot: "bg-red-400",   text: "text-red-300",   bg: "hover:bg-red-400/5"   },
                info:    { dot: "bg-emerald-400",text: "text-emerald-300",bg: "hover:bg-emerald-400/5"},
              }[alert.type];
              return (
                <Link
                  key={i}
                  href={alert.link}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${styles.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
                  <p className={`text-xs flex-1 ${styles.text}`}>{alert.text}</p>
                  {alert.link !== "#" && (
                    <span className="material-symbols-outlined text-slate-600 text-base">chevron_right</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-[#1e2130] border border-[#2a2d3e] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Actividad reciente</h3>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <span className="material-symbols-outlined text-slate-600 text-3xl mb-2">history</span>
            <p className="text-xs text-slate-500">Sin actividad registrada</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2d3e]">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{a.action}</p>
                  {a.details && <p className="text-xs text-slate-500 truncate mt-0.5">{a.details}</p>}
                </div>
                <p className="text-[10px] text-slate-600 whitespace-nowrap shrink-0">
                  {new Date(a.created_at).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
