"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

interface Appointment {
  id: string;
  client_name: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
}

function fmt(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")}`;
}

// Card estilo Litigium: borde gradiente + inner shadow
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] transition-all hover:from-[#333338] hover:to-[#222225] ${className}`}>
      <div className="rounded-[19px] bg-[#161619] h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_32px_-8px_rgba(0,0,0,0.6)]">
        {children}
      </div>
    </div>
  );
}

export default function VentasResumenPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ disponibles: 0, reservados: 0, ventasMes: 0, gananciaMes: 0, ticketProm: 0, valorStock: 0 });
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [alerts, setAlerts] = useState<{ text: string; type: "warning" | "danger" | "ok"; link: string }[]>([]);
  const [turnosHoy, setTurnosHoy] = useState<Appointment[]>([]);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const monthStr = now.toISOString().slice(0, 7);

      const [prodRes, salesRes, actRes, aptRes, warrantyRes] = await Promise.all([
        supabase.from("ig_products").select("*"),
        supabase.from("ig_sales").select("*"),
        supabase.from("ig_activity_log").select("*").order("created_at", { ascending: false }).limit(6),
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

      const al: { text: string; type: "warning" | "danger" | "ok"; link: string }[] = [];
      if (disp.length === 0) al.push({ text: "Sin stock disponible", type: "danger", link: "/ventas/stock" });
      else if (disp.length <= 3) al.push({ text: `Stock bajo — ${disp.length} equipo(s)`, type: "warning", link: "/ventas/stock" });
      const lowBat = disp.filter(p => p.battery_health < 80);
      if (lowBat.length) al.push({ text: `${lowBat.length} equipo(s) con batería < 80%`, type: "warning", link: "/ventas/stock" });
      const stale = disp.filter(p => (Date.now() - new Date(p.created_at).getTime()) / 86400000 > 30);
      if (stale.length) al.push({ text: `${stale.length} equipo(s) sin vender +30 días`, type: "warning", link: "/ventas/metricas" });
      const openW = warranties.filter(w => w.status === "abierta");
      if (openW.length) al.push({ text: `${openW.length} garantía(s) abierta(s)`, type: "warning", link: "/ventas/metricas" });
      if (al.length === 0) al.push({ text: "Todo en orden", type: "ok", link: "#" });
      setAlerts(al);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <div className="w-4 h-4 rounded-full border border-white/20 border-t-white/60 animate-spin" />
    </div>
  );

  const stLabel = (s: string) => ({
    pendiente:  { label: "Pendiente",  color: "rgba(255,255,255,0.3)" },
    confirmado: { label: "Confirmado", color: "rgba(255,255,255,0.6)" },
    completado: { label: "Completado", color: "rgba(134,239,172,0.8)" },
    "no-show":  { label: "No asistió", color: "rgba(252,165,165,0.7)" },
  }[s] || { label: s, color: "rgba(255,255,255,0.3)" });

  const kpiCards = [
    { label: "Disponibles",    value: kpis.disponibles.toString(), sub: "en stock",   link: "/ventas/stock"    },
    { label: "Reservados",     value: kpis.reservados.toString(),  sub: "con seña",   link: "/ventas/turnos"   },
    { label: "Ventas",         value: kpis.ventasMes.toString(),   sub: "este mes",   link: "/ventas/metricas" },
    { label: "Ganancia",       value: fmt(kpis.gananciaMes),       sub: "este mes",   link: "/ventas/metricas" },
    { label: "Ticket prom.",   value: fmt(kpis.ticketProm),        sub: "por venta",  link: "/ventas/metricas" },
    { label: "Valor stock",    value: fmt(kpis.valorStock),        sub: "disponible", link: "/ventas/stock"    },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-white/50 uppercase tracking-[0.14em] mb-2">
            {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-[28px] font-medium text-white/90 leading-none tracking-tight">Resumen</h1>
        </div>
        <Link
          href="/ventas/stock"
          className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          Agregar equipo
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((k) => (
          <Link key={k.label} href={k.link}>
            <GlassCard>
              <div className="p-5">
                <p className="text-[11px] font-normal text-white/50 uppercase tracking-[0.14em] mb-4">{k.label}</p>
                <p className="text-[28px] font-medium text-white/90 leading-none tracking-tight">{k.value}</p>
                <p className="text-[11px] text-white/45 mt-1.5">{k.sub}</p>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>

      {/* Turnos + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Turnos */}
        <GlassCard>
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[11px] font-normal text-white/50 uppercase tracking-[0.14em]">Turnos de hoy</p>
              <Link href="/ventas/turnos" className="text-[11px] text-white/50 hover:text-white/50 transition-colors">
                Ver todos →
              </Link>
            </div>
            {turnosHoy.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <p className="text-sm text-white/45">Sin turnos para hoy</p>
              </div>
            ) : (
              <div className="space-y-1">
                {turnosHoy.map((t) => {
                  const st = stLabel(t.status);
                  return (
                    <div key={t.id} className="flex items-center gap-4 py-2.5 border-b border-white/[0.04] last:border-0">
                      <p className="text-sm font-semibold text-white/70 tabular-nums w-12 shrink-0">
                        {new Date(t.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-sm text-white/60 flex-1 truncate">{t.client_name}</p>
                      <p className="text-[11px] shrink-0" style={{ color: st.color }}>{st.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </GlassCard>

        {/* Alertas */}
        <GlassCard>
          <div className="p-5">
            <p className="text-[11px] font-normal text-white/50 uppercase tracking-[0.14em] mb-5">Estado del sistema</p>
            <div className="space-y-1">
              {alerts.map((alert, i) => {
                const dot = { warning: "#f59e0b", danger: "#ef4444", ok: "#22c55e" }[alert.type];
                return (
                  <Link
                    key={i}
                    href={alert.link}
                    className="flex items-center gap-3 py-2.5 border-b border-white/[0.04] last:border-0 hover:opacity-80 transition-opacity"
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
                    <p className="text-sm text-white/50 flex-1">{alert.text}</p>
                    {alert.link !== "#" && (
                      <span className="material-symbols-outlined text-white/15 text-base">chevron_right</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Actividad */}
      <GlassCard>
        <div className="p-5">
          <p className="text-[11px] font-normal text-white/50 uppercase tracking-[0.14em] mb-5">Actividad reciente</p>
          {activity.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm text-white/45">Sin actividad registrada</p>
            </div>
          ) : (
            <div className="space-y-0">
              {activity.map((a) => (
                <div key={a.id} className="flex items-start gap-4 py-2.5 border-b border-white/[0.04] last:border-0">
                  <div className="w-1 h-1 rounded-full bg-white/20 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/55 truncate">{a.action}</p>
                    {a.details && <p className="text-[11px] text-white/45 truncate mt-0.5">{a.details}</p>}
                  </div>
                  <p className="text-[11px] text-white/45 shrink-0 tabular-nums whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

    </div>
  );
}
