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

function formatPrice(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")} USD`;
}

export default function VentasResumenPage() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ disponibles: 0, reservadosHoy: 0, ventasMes: 0, valorStock: 0 });
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [turnosHoy, setTurnosHoy] = useState(0);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const monthStr = now.toISOString().slice(0, 7);

      const [prodRes, salesRes, actRes, aptRes] = await Promise.all([
        supabase.from("ig_products").select("*"),
        supabase.from("ig_sales").select("*"),
        supabase.from("ig_activity_log").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("ig_appointments").select("*").gte("scheduled_at", todayStr + "T00:00:00").lte("scheduled_at", todayStr + "T23:59:59"),
      ]);

      const products = (prodRes.data || []) as { status: string; sale_price: number | null; battery_health: number; model: string }[];
      const salesData = (salesRes.data || []) as { sold_at: string; created_at: string }[];

      const disponibles = products.filter((p) => p.status === "disponible").length;
      const reservadosHoy = products.filter((p) => p.status === "reservado").length;
      const ventasMes = salesData.filter((s) => (s.sold_at || s.created_at).startsWith(monthStr)).length;
      const valorStock = products.filter((p) => p.status === "disponible").reduce((s, p) => s + (p.sale_price || 0), 0);

      setKpis({ disponibles, reservadosHoy, ventasMes, valorStock });
      setActivity((actRes.data || []) as ActivityLog[]);
      setTurnosHoy((aptRes.data || []).length);

      // Alerts
      const alertList: string[] = [];
      const lowBattery = products.filter((p) => p.status === "disponible" && p.battery_health < 80);
      if (lowBattery.length > 0) alertList.push(`${lowBattery.length} equipo(s) con batería < 80%`);
      if ((aptRes.data || []).length > 0) alertList.push(`${(aptRes.data || []).length} turno(s) programados hoy`);
      if (disponibles === 0) alertList.push("Sin stock disponible");
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

  const quickLinks = [
    { href: "/ventas/stock", icon: "inventory_2", label: "Stock", desc: "Gestión de equipos" },
    { href: "/ventas/turnos", icon: "calendar_month", label: "Turnos", desc: "Agenda de citas" },
    { href: "/ventas/trade-in", icon: "swap_horiz", label: "Trade-in", desc: "Cotización y canje" },
    { href: "/ventas/clientes", icon: "people", label: "Clientes", desc: "Base de clientes" },
    { href: "/ventas/rendicion", icon: "receipt", label: "Rendición", desc: "Liquidación consignación" },
    { href: "/ventas/inbox", icon: "chat", label: "Inbox", desc: "Mensajes de ventas" },
  ];

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Venta de iPhone</h2>
        <p className="text-on-surface-variant text-sm mt-1">Resumen general del módulo de ventas</p>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Equipos Disponibles", value: kpis.disponibles.toString(), icon: "phone_iphone", iconBg: "bg-green-50", iconColor: "text-green-600" },
          { label: "Reservados Hoy", value: kpis.reservadosHoy.toString(), icon: "schedule", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
          { label: "Ventas del Mes", value: kpis.ventasMes.toString(), icon: "sell", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
          { label: "Valor Total Stock", value: formatPrice(kpis.valorStock), icon: "trending_up", iconBg: "bg-green-50", iconColor: "text-green-600" },
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

      <div className="grid grid-cols-12 gap-8">
        {/* Actividad reciente */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
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
              <div className="space-y-3">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                    <span className="material-symbols-outlined text-cool-grey mt-0.5">circle</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{a.action}</p>
                      {a.details && <p className="text-xs text-on-surface-variant mt-0.5">{a.details}</p>}
                      <p className="text-[10px] text-cool-grey mt-1">
                        {new Date(a.created_at).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links rápidos */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-primary">grid_view</span>
              <h3 className="text-lg font-bold">Accesos Rápidos</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex flex-col items-center gap-2 p-5 rounded-xl bg-slate-50 hover:bg-primary/5 hover:shadow-sm transition-all group"
                >
                  <span className="material-symbols-outlined text-2xl text-cool-grey group-hover:text-primary transition-colors">{link.icon}</span>
                  <p className="text-sm font-bold group-hover:text-primary transition-colors">{link.label}</p>
                  <p className="text-[10px] text-on-surface-variant text-center">{link.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Alertas + info lateral */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Alertas */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="material-symbols-outlined text-amber-500">warning</span>
              <h3 className="text-lg font-bold">Alertas</h3>
            </div>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-cool-grey">
                <span className="material-symbols-outlined text-3xl mb-2 text-green-500">check_circle</span>
                <p className="text-xs font-medium">Todo en orden, sin alertas</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <span className="material-symbols-outlined text-amber-600 text-lg">warning</span>
                    <p className="text-xs font-medium text-amber-800">{alert}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Turnos de hoy */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_today</span>
                <h3 className="text-lg font-bold">Turnos de Hoy</h3>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{turnosHoy}</span>
            </div>
            <Link href="/ventas/turnos" className="text-xs font-bold text-primary hover:underline">
              Ver todos los turnos →
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
