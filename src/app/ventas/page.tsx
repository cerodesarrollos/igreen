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
  return `$${n.toLocaleString("es-AR")} USD`;
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
        supabase.from("ig_activity_log").select("*").order("created_at", { ascending: false }).limit(10),
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

      // Alerts
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
      if (disponibles > 0 && disponibles <= 3) alertList.push({ text: `Stock bajo: solo ${disponibles} equipo(s)`, type: "warning", link: "/ventas/stock" });
      if (alertList.length === 0) alertList.push({ text: "Todo en orden", type: "info", link: "#" });

      setAlerts(alertList);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-sm text-cool-grey">Cargando resumen...</span>
      </div>
    );
  }

  const kpiCards = [
    { label: "Disponibles", value: kpis.disponibles.toString(), icon: "phone_iphone", bg: "bg-green-50", color: "text-green-600", link: "/ventas/stock" },
    { label: "Reservados", value: kpis.reservados.toString(), icon: "schedule", bg: "bg-amber-50", color: "text-amber-600", link: "/ventas/turnos" },
    { label: "Ventas Mes", value: kpis.ventasMes.toString(), icon: "sell", bg: "bg-blue-50", color: "text-blue-600", link: "/ventas/metricas" },
    { label: "Ganancia Mes", value: formatPrice(kpis.gananciaMes), icon: "trending_up", bg: "bg-emerald-50", color: "text-emerald-600", link: "/ventas/metricas" },
    { label: "Ticket Promedio", value: formatPrice(kpis.ticketProm), icon: "receipt", bg: "bg-violet-50", color: "text-violet-600", link: "/ventas/metricas" },
    { label: "Valor Stock", value: formatPrice(kpis.valorStock), icon: "account_balance_wallet", bg: "bg-sky-50", color: "text-sky-600", link: "/ventas/stock" },
  ];

  const alertStyles = {
    warning: { bg: "bg-amber-50", border: "border-amber-100", icon: "warning", iconColor: "text-amber-600", textColor: "text-amber-800" },
    danger: { bg: "bg-red-50", border: "border-red-100", icon: "error", iconColor: "text-red-600", textColor: "text-red-800" },
    info: { bg: "bg-green-50", border: "border-green-100", icon: "check_circle", iconColor: "text-green-600", textColor: "text-green-800" },
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      pendiente: { label: "Pendiente", color: "bg-slate-100 text-slate-700" },
      confirmado: { label: "Confirmado", color: "bg-green-100 text-green-700" },
      completado: { label: "Completado", color: "bg-blue-100 text-blue-700" },
      "no-show": { label: "No asistió", color: "bg-red-100 text-red-700" },
    };
    return map[s] || { label: s, color: "bg-slate-100 text-slate-700" };
  };

  return (
    <>
      {/* FILA 1 — KPIs clickeables */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {kpiCards.map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.link}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-primary/20 transition-all group cursor-pointer"
          >
            <div className={`p-1.5 ${kpi.bg} rounded-lg w-fit mb-3`}>
              <span className={`material-symbols-outlined ${kpi.color} text-lg`}>{kpi.icon}</span>
            </div>
            <p className="text-[10px] text-cool-grey font-bold uppercase tracking-wider mb-0.5">{kpi.label}</p>
            <h3 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">{kpi.value}</h3>
          </Link>
        ))}
      </section>

      {/* FILA 2 — Turnos de Hoy + Alertas */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Turnos de Hoy */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">calendar_today</span>
              <h3 className="text-lg font-bold">Turnos de Hoy</h3>
            </div>
            <Link href="/ventas/turnos" className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors">
              Ver todos →
            </Link>
          </div>
          {turnosHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-cool-grey">
              <span className="material-symbols-outlined text-3xl mb-2">event_available</span>
              <p className="text-xs font-medium">Sin turnos programados para hoy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {turnosHoy.map((t) => {
                const st = statusLabel(t.status);
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="text-center min-w-[44px]">
                      <p className="text-sm font-bold text-primary">
                        {new Date(t.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.client_name}</p>
                      {t.notes && <p className="text-[10px] text-cool-grey truncate">{t.notes}</p>}
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-amber-500">notification_important</span>
            <h3 className="text-lg font-bold">Alertas</h3>
          </div>
          <div className="space-y-2">
            {alerts.map((alert, i) => {
              const s = alertStyles[alert.type];
              return (
                <Link
                  key={i}
                  href={alert.link}
                  className={`flex items-center gap-3 p-3 rounded-xl ${s.bg} border ${s.border} hover:brightness-95 transition-all`}
                >
                  <span className={`material-symbols-outlined ${s.iconColor} text-lg`}>{s.icon}</span>
                  <p className={`text-xs font-medium ${s.textColor} flex-1`}>{alert.text}</p>
                  {alert.link !== "#" && <span className="material-symbols-outlined text-cool-grey text-sm">chevron_right</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* FILA 3 — Actividad Reciente (ancho completo) */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <span className="material-symbols-outlined text-primary">history</span>
          <h3 className="text-lg font-bold">Actividad Reciente</h3>
        </div>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-cool-grey">
            <span className="material-symbols-outlined text-3xl mb-2">history</span>
            <p className="text-xs font-medium">Sin actividad registrada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.action}</p>
                  {a.details && <p className="text-xs text-on-surface-variant mt-0.5 truncate">{a.details}</p>}
                  <p className="text-[10px] text-cool-grey mt-1">
                    {new Date(a.created_at).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
