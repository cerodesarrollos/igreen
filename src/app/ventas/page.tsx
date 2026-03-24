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

function fmt(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")}`;
}

function todayLabel() {
  return new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function VentasResumenPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ disponibles: 0, reservados: 0, ventasMes: 0, gananciaMes: 0, ticketProm: 0, valorStock: 0 });
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
        supabase.from("ig_appointments").select("*").gte("scheduled_at", todayStr + "T00:00:00").lte("scheduled_at", todayStr + "T23:59:59").order("scheduled_at"),
        supabase.from("ig_warranties").select("id, status"),
      ]);

      const products = (prodRes.data || []) as { status: string; sale_price: number | null; cost_price: number | null; battery_health: number; created_at: string }[];
      const salesData = (salesRes.data || []) as { sold_at: string; created_at: string; sale_price: number; cost_price: number }[];
      const warranties = (warrantyRes.data || []) as { id: string; status: string }[];

      const disp = products.filter(p => p.status === "disponible");
      const ventasMes = salesData.filter(s => (s.sold_at || s.created_at).startsWith(monthStr));
      const count = ventasMes.length;
      const gain = ventasMes.reduce((s, v) => s + ((v.sale_price || 0) - (v.cost_price || 0)), 0);
      const ticket = count > 0 ? ventasMes.reduce((s, v) => s + (v.sale_price || 0), 0) / count : 0;
      const valorStock = disp.reduce((s, p) => s + (p.sale_price || 0), 0);

      setKpis({ disponibles: disp.length, reservados: products.filter(p => p.status === "reservado").length, ventasMes: count, gananciaMes: gain, ticketProm: ticket, valorStock });
      setActivity((actRes.data || []) as ActivityLog[]);
      setTurnosHoy((aptRes.data || []) as Appointment[]);

      const al: { text: string; type: "warning" | "danger" | "info"; link: string }[] = [];
      if (disp.length === 0) al.push({ text: "Sin stock disponible", type: "danger", link: "/ventas/stock" });
      else if (disp.length <= 3) al.push({ text: `Stock bajo — solo ${disp.length} equipo(s)`, type: "warning", link: "/ventas/stock" });
      const lowBat = disp.filter(p => p.battery_health < 80);
      if (lowBat.length) al.push({ text: `${lowBat.length} equipo(s) con batería < 80%`, type: "warning", link: "/ventas/stock" });
      const stale = disp.filter(p => (Date.now() - new Date(p.created_at).getTime()) / 86400000 > 30);
      if (stale.length) al.push({ text: `${stale.length} equipo(s) sin vender hace +30 días`, type: "danger", link: "/ventas/metricas" });
      const openW = warranties.filter(w => w.status === "abierta");
      if (openW.length) al.push({ text: `${openW.length} garantía(s) abierta(s)`, type: "warning", link: "/ventas/metricas" });
      if (al.length === 0) al.push({ text: "Todo en orden ✓", type: "info", link: "#" });
      setAlerts(al);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
    </div>
  );

  const stLabel = (s: string) => ({
    pendiente:  { label: "Pendiente",  bg: "rgba(255,255,255,0.06)",  color: "#94a3b8" },
    confirmado: { label: "Confirmado", bg: "rgba(139,92,246,0.15)",   color: "#a78bfa" },
    completado: { label: "Completado", bg: "rgba(52,211,153,0.12)",   color: "#6ee7b7" },
    "no-show":  { label: "No asistió", bg: "rgba(239,68,68,0.12)",    color: "#fca5a5" },
  }[s] || { label: s, bg: "rgba(255,255,255,0.06)", color: "#94a3b8" });

  const kpiCards = [
    { label: "Disponibles",     value: kpis.disponibles.toString(),  icon: "phone_iphone",          link: "/ventas/stock",    accent: false },
    { label: "Reservados",      value: kpis.reservados.toString(),   icon: "schedule",              link: "/ventas/turnos",   accent: false },
    { label: "Ventas del mes",  value: kpis.ventasMes.toString(),    icon: "sell",                  link: "/ventas/metricas", accent: true  },
    { label: "Ganancia",        value: fmt(kpis.gananciaMes),        icon: "trending_up",           link: "/ventas/metricas", accent: true  },
    { label: "Ticket promedio", value: fmt(kpis.ticketProm),         icon: "receipt_long",          link: "/ventas/metricas", accent: false },
    { label: "Valor stock",     value: fmt(kpis.valorStock),         icon: "account_balance_wallet", link: "/ventas/stock",   accent: false },
  ];

  return (
    <div className="space-y-6">

      {/* Top bar */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-600 capitalize mb-1">{todayLabel()}</p>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {greet()}, Matias
          </h1>
          <p className="text-xs text-slate-500 mt-1">Acá está el estado del negocio</p>
        </div>
        <Link
          href="/ventas/stock"
          className="flex items-center gap-2 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)" }}
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          Agregar equipo
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <Link
            key={k.label}
            href={k.link}
            className="card-glow group rounded-xl p-4 border flex flex-col gap-3 transition-all duration-200"
            style={{
              background: k.accent
                ? "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(99,102,241,0.06))"
                : "rgba(255,255,255,0.03)",
              borderColor: k.accent ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.06)",
            }}
          >
            <span
              className={`material-symbols-outlined text-[18px] transition-colors ${k.accent ? "text-violet-400" : "text-slate-600 group-hover:text-violet-400"}`}
              style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}
            >
              {k.icon}
            </span>
            <div>
              <p className="text-xl font-black text-white tracking-tight leading-none">{k.value}</p>
              <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider leading-tight">{k.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Turnos + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Turnos */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-400 text-[16px]">calendar_today</span>
              <h3 className="text-sm font-semibold text-white">Turnos de hoy</h3>
              {turnosHoy.length > 0 && (
                <span className="text-[9px] font-bold bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">
                  {turnosHoy.length}
                </span>
              )}
            </div>
            <Link href="/ventas/turnos" className="text-[10px] text-slate-500 hover:text-violet-400 transition-colors uppercase tracking-wider font-semibold">
              Ver todos →
            </Link>
          </div>
          {turnosHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <span className="material-symbols-outlined text-slate-700 text-4xl">event_available</span>
              <p className="text-xs text-slate-600">Sin turnos para hoy</p>
            </div>
          ) : (
            <div className="space-y-1">
              {turnosHoy.map((t) => {
                const st = stLabel(t.status);
                return (
                  <div key={t.id} className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/4 transition-colors">
                    <p className="text-sm font-black text-violet-400 tabular-nums min-w-[42px]">
                      {new Date(t.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate font-medium">{t.client_name}</p>
                      {t.notes && <p className="text-[10px] text-slate-600 truncate">{t.notes}</p>}
                    </div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alertas */}
        <div
          className="rounded-xl border p-5"
          style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-400 text-[16px]">notifications_active</span>
              <h3 className="text-sm font-semibold text-white">Alertas</h3>
            </div>
            <span className="text-[9px] font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/6">
              {alerts.length}
            </span>
          </div>
          <div className="space-y-1">
            {alerts.map((alert, i) => {
              const styles = {
                warning: { dot: "#fbbf24", text: "#fcd34d", bg: "rgba(251,191,36,0.06)"  },
                danger:  { dot: "#f87171", text: "#fca5a5", bg: "rgba(248,113,113,0.06)" },
                info:    { dot: "#6ee7b7", text: "#a7f3d0", bg: "rgba(110,231,183,0.06)" },
              }[alert.type];
              return (
                <Link
                  key={i}
                  href={alert.link}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                  style={{ background: styles.bg }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: styles.dot }} />
                  <p className="text-xs flex-1" style={{ color: styles.text }}>{alert.text}</p>
                  {alert.link !== "#" && (
                    <span className="material-symbols-outlined text-slate-600 text-base">chevron_right</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Actividad */}
      <div
        className="rounded-xl border p-5"
        style={{ background: "rgba(255,255,255,0.025)", borderColor: "rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-violet-400 text-[16px]">history</span>
          <h3 className="text-sm font-semibold text-white">Actividad reciente</h3>
        </div>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <span className="material-symbols-outlined text-slate-700 text-4xl">history_toggle_off</span>
            <p className="text-xs text-slate-600">Sin actividad registrada</p>
          </div>
        ) : (
          <div className="space-y-0">
            {activity.map((a, i) => (
              <div key={a.id} className="flex items-start gap-3 py-2.5 border-b border-white/4 last:border-0">
                <div className="flex flex-col items-center pt-1 gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500/60 shrink-0" />
                  {i < activity.length - 1 && <div className="w-px flex-1 bg-violet-500/10 min-h-[12px]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 truncate">{a.action}</p>
                  {a.details && <p className="text-[10px] text-slate-600 truncate mt-0.5">{a.details}</p>}
                </div>
                <p className="text-[10px] text-slate-700 whitespace-nowrap shrink-0 tabular-nums">
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
