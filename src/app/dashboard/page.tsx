"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* ───── types ───── */
interface ActivityLog {
  id: string;
  entity_type: string;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/* ───── component ───── */
export default function DashboardPage() {
  const [totalProducts, setTotalProducts] = useState(0);
  const [disponibles, setDisponibles] = useState(0);
  const [vendidosMes, setVendidosMes] = useState(0);
  const [turnosHoy, setTurnosHoy] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      setLoading(true);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const todayStr = now.toISOString().slice(0, 10);

      const [prodRes, salesRes, aptRes, actRes] = await Promise.all([
        supabase.from("ig_products").select("id, status"),
        supabase.from("ig_sales").select("id, sold_at, created_at").gte("sold_at", monthStart),
        supabase.from("ig_appointments").select("id, scheduled_at").gte("scheduled_at", todayStr + "T00:00:00").lte("scheduled_at", todayStr + "T23:59:59"),
        supabase.from("ig_activity_log").select("*").order("created_at", { ascending: false }).limit(5),
      ]);

      if (prodRes.data) {
        setTotalProducts(prodRes.data.length);
        setDisponibles(prodRes.data.filter((p) => p.status === "disponible").length);
      }
      if (salesRes.data) setVendidosMes(salesRes.data.length);
      if (aptRes.data) setTurnosHoy(aptRes.data.length);
      if (actRes.data) setRecentActivity(actRes.data as ActivityLog[]);
      setLoading(false);
    }
    fetchDashboard();
  }, []);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }

  function actionColor(action: string) {
    if (action.includes("venta") || action.includes("sold")) return "bg-primary";
    if (action.includes("create") || action.includes("add")) return "bg-blue-500";
    if (action.includes("update") || action.includes("edit")) return "bg-amber-500";
    return "bg-slate-300";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-sm text-cool-grey">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <>
      {/* KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Equipos en stock", value: disponibles.toString(), icon: "phone_iphone", up: true },
          { label: "Total productos", value: totalProducts.toString(), icon: "devices", up: true },
          { label: "Vendidos este mes", value: vendidosMes.toString(), icon: "sell", up: true },
          { label: "Turnos hoy", value: turnosHoy.toString(), icon: "event", up: true },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-cool-grey text-[11px] font-bold uppercase tracking-wider">{kpi.label}</p>
              <h3 className="text-xl font-black mt-0.5">{kpi.value}</h3>
            </div>
            <div className="text-right">
              <div className="mt-2 text-cool-grey">
                <span className="material-symbols-outlined text-lg">{kpi.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Equipos Pendientes */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest">Resumen Rápido</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg text-green-600">check_circle</span>
                  </div>
                  <div>
                    <p className="font-bold text-xs">Disponibles</p>
                    <p className="text-[10px] text-cool-grey">Para venta</p>
                  </div>
                </div>
                <p className="text-lg font-black text-primary">{disponibles}</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg text-blue-600">sell</span>
                  </div>
                  <div>
                    <p className="font-bold text-xs">Vendidos (mes)</p>
                    <p className="text-[10px] text-cool-grey">Este mes</p>
                  </div>
                </div>
                <p className="text-lg font-black text-blue-600">{vendidosMes}</p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg text-amber-600">event</span>
                  </div>
                  <div>
                    <p className="font-bold text-xs">Turnos hoy</p>
                    <p className="text-[10px] text-cool-grey">Programados</p>
                  </div>
                </div>
                <p className="text-lg font-black text-amber-600">{turnosHoy}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Weekly Revenue + Tickets (static, keep design) */}
        <div className="col-span-12 lg:col-span-6 space-y-6">
          {/* Weekly Revenue Chart — static placeholder */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest">Ingresos Semanales</h2>
                <p className="text-[10px] text-cool-grey">Desglose de ingresos 7 días</p>
              </div>
              <select className="bg-slate-100 border-slate-200 rounded-lg px-3 py-1 text-[10px] font-bold focus:ring-0 border">
                <option>Esta semana</option>
                <option>Semana pasada</option>
              </select>
            </div>
            <div className="flex items-end justify-between h-40 px-2 gap-2">
              {[
                { day: "Lun", h: "h-20", active: false },
                { day: "Mar", h: "h-28", active: false },
                { day: "Mié", h: "h-24", active: false },
                { day: "Jue", h: "h-32", active: true },
                { day: "Vie", h: "h-[5.5rem]", active: false },
                { day: "Sáb", h: "h-14", active: false },
                { day: "Dom", h: "h-10", active: false },
              ].map((bar) => (
                <div key={bar.day} className="flex flex-col items-center gap-2 flex-1">
                  <div className={`w-full rounded-t-sm ${bar.h} ${bar.active ? "bg-primary relative" : "bg-slate-100 hover:bg-primary/20 transition-all"}`}>
                    {bar.active && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-primary font-bold text-[9px]">$12k</div>
                    )}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-tighter ${bar.active ? "text-primary" : "text-cool-grey"}`}>
                    {bar.day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Service Tickets Table — static placeholder */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-sm font-black uppercase tracking-widest">Tickets de Servicio</h2>
              <a className="text-[10px] font-bold text-primary flex items-center gap-1 hover:underline" href="#">
                VER TODO <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
              </a>
            </div>
            <div className="flex flex-col items-center justify-center py-12 text-cool-grey">
              <span className="material-symbols-outlined text-3xl mb-2">confirmation_number</span>
              <p className="text-xs font-medium">Próximamente — Tickets de servicio técnico</p>
            </div>
          </div>
        </div>

        {/* Right Column: Real-time Feed */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full">
            <h2 className="text-sm font-black uppercase tracking-widest mb-6">Actividad reciente</h2>

            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-cool-grey">
                <span className="material-symbols-outlined text-3xl mb-2">history</span>
                <p className="text-xs font-medium">Sin actividad registrada</p>
              </div>
            ) : (
              <div className="space-y-6 relative ml-2">
                <div className="absolute left-[-8px] top-0 bottom-0 w-px bg-slate-100" />
                {recentActivity.map((act) => (
                  <div key={act.id} className="relative pl-4">
                    <div className={`absolute left-[-11px] top-1 w-1.5 h-1.5 rounded-full ${actionColor(act.action)} ring-4 ring-white`} />
                    <div>
                      <p className="text-[11px] font-bold">{act.description || `${act.entity_type}: ${act.action}`}</p>
                      <p className="text-[9px] text-cool-grey mt-0.5">{timeAgo(act.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-10 pt-6 border-t border-slate-100">
              <p className="text-[10px] font-bold text-cool-grey uppercase tracking-widest mb-4">Acciones Rápidas</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: "print", label: "Imprimir Etiqueta" },
                  { icon: "contact_support", label: "Email Cliente" },
                ].map((cmd) => (
                  <button key={cmd.label} className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 hover:bg-slate-50 text-cool-grey hover:text-primary transition-all">
                    <span className="material-symbols-outlined mb-1">{cmd.icon}</span>
                    <span className="text-[9px] font-bold uppercase">{cmd.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
