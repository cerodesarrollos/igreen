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
  scheduled_at: string;
  status: string;
  notes: string | null;
}

function fmt(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")}`;
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
      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin opacity-40" />
    </div>
  );

  const stLabel = (s: string) => ({
    pendiente:  { label: "Pendiente",  color: "#555" },
    confirmado: { label: "Confirmado", color: "#888" },
    completado: { label: "Completado", color: "#aaa" },
    "no-show":  { label: "No asistió", color: "#666" },
  }[s] || { label: s, color: "#555" });

  return (
    <div className="space-y-10">

      {/* Page header */}
      <div className="flex items-end justify-between border-b border-[#1a1a1a] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Resumen</h1>
          <p className="text-sm text-[#555] mt-1">
            {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Link
          href="/ventas/stock"
          className="flex items-center gap-2 bg-white text-black text-sm font-semibold px-4 py-2 rounded-md hover:bg-[#ededed] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Agregar equipo
        </Link>
      </div>

      {/* KPIs */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-[#444] mb-4">Métricas del mes</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Disponibles",    value: kpis.disponibles.toString(), sub: "en stock",      link: "/ventas/stock"    },
            { label: "Reservados",     value: kpis.reservados.toString(),  sub: "con seña",      link: "/ventas/turnos"   },
            { label: "Ventas",         value: kpis.ventasMes.toString(),   sub: "este mes",      link: "/ventas/metricas" },
            { label: "Ganancia",       value: fmt(kpis.gananciaMes),       sub: "este mes",      link: "/ventas/metricas" },
            { label: "Ticket prom.",   value: fmt(kpis.ticketProm),        sub: "por venta",     link: "/ventas/metricas" },
            { label: "Valor stock",    value: fmt(kpis.valorStock),        sub: "disponible",    link: "/ventas/stock"    },
          ].map((k) => (
            <Link
              key={k.label}
              href={k.link}
              className="group border border-[#1a1a1a] rounded-lg p-4 hover:border-[#333] transition-colors"
            >
              <p className="text-2xl font-bold text-white tabular-nums tracking-tight group-hover:text-white">{k.value}</p>
              <p className="text-xs font-medium text-[#ededed] mt-1">{k.label}</p>
              <p className="text-[10px] text-[#444] mt-0.5">{k.sub}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Alertas + Turnos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Alertas */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-[#444] mb-4">Estado del sistema</p>
          <div className="border border-[#1a1a1a] rounded-lg divide-y divide-[#1a1a1a]">
            {alerts.map((alert, i) => {
              const dot = { warning: "#f59e0b", danger: "#ef4444", ok: "#22c55e" }[alert.type];
              return (
                <Link
                  key={i}
                  href={alert.link}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#111] transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />
                  <p className="text-sm text-[#aaa] flex-1">{alert.text}</p>
                  {alert.link !== "#" && (
                    <span className="material-symbols-outlined text-[#333] text-base">chevron_right</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Turnos de hoy */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-medium uppercase tracking-widest text-[#444]">Turnos de hoy</p>
            <Link href="/ventas/turnos" className="text-xs text-[#555] hover:text-[#888] transition-colors">
              Ver todos →
            </Link>
          </div>
          <div className="border border-[#1a1a1a] rounded-lg">
            {turnosHoy.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-[#333]">Sin turnos para hoy</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {turnosHoy.map((t) => {
                  const st = stLabel(t.status);
                  return (
                    <div key={t.id} className="flex items-center gap-4 px-4 py-3 hover:bg-[#111] transition-colors first:rounded-t-lg last:rounded-b-lg">
                      <p className="text-sm font-semibold text-white tabular-nums w-12 shrink-0">
                        {new Date(t.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#ededed] truncate">{t.client_name}</p>
                        {t.notes && <p className="text-[10px] text-[#444] truncate">{t.notes}</p>}
                      </div>
                      <p className="text-xs shrink-0" style={{ color: st.color }}>{st.label}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actividad */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-[#444] mb-4">Actividad reciente</p>
        {activity.length === 0 ? (
          <div className="border border-[#1a1a1a] rounded-lg flex items-center justify-center py-12">
            <p className="text-sm text-[#333]">Sin actividad registrada</p>
          </div>
        ) : (
          <div className="border border-[#1a1a1a] rounded-lg divide-y divide-[#1a1a1a]">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-4 px-4 py-3 hover:bg-[#111] transition-colors first:rounded-t-lg last:rounded-b-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-[#333] mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#aaa] truncate">{a.action}</p>
                  {a.details && <p className="text-xs text-[#444] truncate mt-0.5">{a.details}</p>}
                </div>
                <p className="text-[11px] text-[#333] shrink-0 tabular-nums whitespace-nowrap">
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
