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

function getGreeting() {
  const h = new Date().getHours();
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
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
        const days = (Date.now() - new Date(p.created_at).getTime()) / 86400000;
        return days > 30;
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
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-900 border-t-transparent" />
        <span className="ml-3 text-sm text-slate-400">Cargando...</span>
      </div>
    );
  }

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pendiente: { label: "Pendiente", color: "bg-slate-100 text-slate-600" },
      confirmado: { label: "Confirmado", color: "bg-indigo-50 text-indigo-700" },
      completado: { label: "Completado", color: "bg-emerald-50 text-emerald-700" },
      "no-show": { label: "No asistió", color: "bg-red-50 text-red-600" },
    };
    return map[s] || { label: s, color: "bg-slate-100 text-slate-600" };
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">{formatDate()}</p>
          <h1 className="text-2xl font-bold text-slate-900">{getGreeting()}, iGreen 👋</h1>
        </div>
        <Link
          href="/ventas/stock"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          Agregar equipo
        </Link>
      </div>

      {/* HERO METRICS — las 2 más importantes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/ventas/metricas" className="group relative bg-slate-900 rounded-2xl p-7 overflow-hidden hover:bg-slate-800 transition-colors">
          {/* fondo decorativo */}
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -right-2 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Ganancia del mes</p>
          <p className="text-4xl font-black text-white tracking-tight mb-1">
            {formatPrice(kpis.gananciaMes)} <span className="text-lg font-semibold text-slate-400">USD</span>
          </p>
          <p className="text-xs text-slate-500">{kpis.ventasMes} venta{kpis.ventasMes !== 1 ? "s" : ""} este mes</p>
          <span className="absolute bottom-6 right-6 material-symbols-outlined text-white/10 text-6xl group-hover:text-white/15 transition-colors">trending_up</span>
        </Link>

        <Link href="/ventas/stock" className="group relative bg-slate-900 rounded-2xl p-7 overflow-hidden hover:bg-slate-800 transition-colors">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -right-2 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Valor en stock</p>
          <p className="text-4xl font-black text-white tracking-tight mb-1">
            {formatPrice(kpis.valorStock)} <span className="text-lg font-semibold text-slate-400">USD</span>
          </p>
          <p className="text-xs text-slate-500">{kpis.disponibles} equipo{kpis.disponibles !== 1 ? "s" : ""} disponible{kpis.disponibles !== 1 ? "s" : ""}</p>
          <span className="absolute bottom-6 right-6 material-symbols-outlined text-white/10 text-6xl group-hover:text-white/15 transition-colors">inventory_2</span>
        </Link>
      </div>

      {/* SECONDARY METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Disponibles", value: kpis.disponibles, suffix: "equipos", icon: "phone_iphone", link: "/ventas/stock" },
          { label: "Reservados", value: kpis.reservados, suffix: "equipos", icon: "schedule", link: "/ventas/turnos" },
          { label: "Ventas mes", value: kpis.ventasMes, suffix: "unidades", icon: "sell", link: "/ventas/metricas" },
          { label: "Ticket promedio", value: formatPrice(kpis.ticketProm), suffix: "USD", icon: "receipt_long", link: "/ventas/metricas", isString: true },
        ].map((k) => (
          <Link
            key={k.label}
            href={k.link}
            className="bg-white border border-slate-100 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{k.label}</p>
              <span className="material-symbols-outlined text-slate-300 text-base group-hover:text-slate-500 transition-colors">{k.icon}</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{k.isString ? k.value : k.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{k.suffix}</p>
          </Link>
        ))}
      </div>

      {/* FILA 3 — Turnos + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Turnos de hoy */}
        <div className="bg-white border border-slate-100 rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[16px]">calendar_today</span>
              </div>
              <h3 className="font-bold text-slate-900">Turnos de hoy</h3>
            </div>
            <Link href="/ventas/turnos" className="text-[10px] font-bold text-slate-400 hover:text-slate-700 transition-colors uppercase tracking-wider">
              Ver todos →
            </Link>
          </div>
          {turnosHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-300">
              <span className="material-symbols-outlined text-4xl mb-2">event_available</span>
              <p className="text-xs font-medium text-slate-400">Sin turnos para hoy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {turnosHoy.map((t) => {
                const st = statusLabel(t.status);
                return (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <p className="text-sm font-black text-slate-900 min-w-[44px]">
                      {new Date(t.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{t.client_name}</p>
                      {t.notes && <p className="text-[10px] text-slate-400 truncate">{t.notes}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${st.color}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="bg-white border border-slate-100 rounded-xl p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[16px]">notifications</span>
            </div>
            <h3 className="font-bold text-slate-900">Alertas</h3>
          </div>
          <div className="space-y-2">
            {alerts.map((alert, i) => {
              const styles = {
                warning: { dot: "bg-amber-400", text: "text-amber-700", bg: "hover:bg-amber-50" },
                danger: { dot: "bg-red-400", text: "text-red-700", bg: "hover:bg-red-50" },
                info: { dot: "bg-emerald-400", text: "text-emerald-700", bg: "hover:bg-emerald-50" },
              }[alert.type];
              return (
                <Link
                  key={i}
                  href={alert.link}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${styles.bg}`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${styles.dot}`} />
                  <p className={`text-xs font-semibold flex-1 ${styles.text}`}>{alert.text}</p>
                  {alert.link !== "#" && <span className="material-symbols-outlined text-slate-300 text-base">chevron_right</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ACTIVIDAD RECIENTE */}
      <div className="bg-white border border-slate-100 rounded-xl p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[16px]">history</span>
          </div>
          <h3 className="font-bold text-slate-900">Actividad reciente</h3>
        </div>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-300">
            <span className="material-symbols-outlined text-4xl mb-2">history</span>
            <p className="text-xs font-medium text-slate-400">Sin actividad registrada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{a.action}</p>
                  {a.details && <p className="text-xs text-slate-400 truncate mt-0.5">{a.details}</p>}
                </div>
                <p className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">
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
