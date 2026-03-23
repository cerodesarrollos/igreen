"use client";

import { useState } from "react";

/* ───── Mock Data ───── */
const DAYS = ["Lun 17", "Mar 18", "Mié 19", "Jue 20", "Vie 21", "Sáb 22", "Dom 23"];

interface Post {
  id: number;
  day: number;
  product: string;
  time: string;
  platforms: string[];
  status: "publicado" | "programado" | "borrador";
  color: string;
}

const MOCK_POSTS: Post[] = [
  { id: 1, day: 0, product: "iPhone 14 Pro Max 256GB", time: "10:30", platforms: ["ig"], status: "publicado", color: "bg-blue-400" },
  { id: 2, day: 0, product: "iPhone 13 128GB", time: "18:00", platforms: ["ig", "wa"], status: "publicado", color: "bg-green-400" },
  { id: 3, day: 1, product: "iPhone 15 Pro 256GB", time: "11:00", platforms: ["ig"], status: "publicado", color: "bg-purple-400" },
  { id: 4, day: 2, product: "iPhone 12 64GB", time: "10:00", platforms: ["wa"], status: "programado", color: "bg-amber-400" },
  { id: 5, day: 3, product: "iPhone 14 Pro Max 256GB", time: "18:00", platforms: ["ig", "wa"], status: "programado", color: "bg-rose-400" },
  { id: 6, day: 4, product: "iPhone 13 Mini 128GB", time: "12:00", platforms: ["ig"], status: "borrador", color: "bg-slate-400" },
  { id: 7, day: 5, product: "iPhone 16 Pro 256GB", time: "10:00", platforms: ["ig", "wa"], status: "programado", color: "bg-teal-400" },
];

const PERFORMANCE_DATA = [
  { equipo: "iPhone 14 Pro Max 256GB", canal: "IG + WA", vistas: 1240, consultas: 8, turnos: 2, estado: "activo" as const },
  { equipo: "iPhone 15 Pro 256GB", canal: "IG", vistas: 890, consultas: 5, turnos: 1, estado: "activo" as const },
  { equipo: "iPhone 13 128GB", canal: "IG + WA", vistas: 620, consultas: 4, turnos: 1, estado: "activo" as const },
  { equipo: "iPhone 12 64GB", canal: "WA", vistas: 340, consultas: 3, turnos: 1, estado: "rebajado" as const },
  { equipo: "iPhone 13 Mini 128GB", canal: "IG", vistas: 180, consultas: 2, turnos: 0, estado: "activo" as const },
  { equipo: "iPhone 11 Pro 256GB", canal: "IG", vistas: 95, consultas: 1, turnos: 0, estado: "agotado" as const },
];

const AGENT_QUEUE = [
  { id: 1, action: "iPhone 14 Pro - Publicar en IG", type: "pending" as const },
  { id: 2, action: "iPhone 12 - Repostear (7 días sin venta)", type: "auto" as const },
  { id: 3, action: "iPhone 13 Mini - Bajar precio 10%", type: "pending" as const },
];

type PeriodKey = "week" | "month" | "90d";

/* ───── Component ───── */
export default function PublicidadPage() {
  const [period, setPeriod] = useState<PeriodKey>("week");
  const [supervisado, setSupervisado] = useState(true);
  const [reglasOpen, setReglasOpen] = useState(false);

  const periods: { key: PeriodKey; label: string }[] = [
    { key: "week", label: "Esta Semana" },
    { key: "month", label: "Este Mes" },
    { key: "90d", label: "Últimos 90 días" },
  ];

  function statusBadge(s: Post["status"]) {
    const map = {
      publicado: "bg-green-100 text-green-700",
      programado: "bg-blue-100 text-blue-700",
      borrador: "bg-slate-100 text-slate-500",
    };
    const labels = { publicado: "Publicado", programado: "Programado", borrador: "Borrador" };
    return (
      <span className={`px-2 py-0.5 ${map[s]} text-[10px] font-bold rounded-full`}>
        {labels[s]}
      </span>
    );
  }

  function estadoBadge(e: "activo" | "agotado" | "rebajado") {
    const map = {
      activo: "bg-green-100 text-green-700",
      agotado: "bg-red-100 text-red-700",
      rebajado: "bg-amber-100 text-amber-700",
    };
    const labels = { activo: "Activo", agotado: "Agotado", rebajado: "Rebajado" };
    return (
      <span className={`px-2.5 py-0.5 ${map[e]} text-[10px] font-bold rounded-full`}>
        {labels[e]}
      </span>
    );
  }

  function platformIcon(p: string) {
    if (p === "ig") {
      return (
        <span key="ig" className="w-5 h-5 rounded-full bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 flex items-center justify-center text-white text-[9px] font-black">
          IG
        </span>
      );
    }
    return (
      <span key="wa" className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[9px] font-black">
        WA
      </span>
    );
  }

  return (
    <>
      {/* ── KPI Cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Posts esta Semana", value: "8", icon: "campaign", bg: "bg-blue-100", color: "text-blue-600" },
          { label: "Consultas Generadas", value: "23", icon: "chat_bubble", bg: "bg-green-100", color: "text-green-600" },
          { label: "Turnos desde Publi", value: "5", icon: "event_available", bg: "bg-amber-100", color: "text-amber-600" },
          { label: "Conversión", value: "21.7%", icon: "trending_up", bg: "bg-purple-100", color: "text-purple-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-xl ${kpi.color}`}>{kpi.icon}</span>
              </div>
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">{kpi.label}</p>
            <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
          </div>
        ))}
      </section>

      {/* ── Chip Filters ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {periods.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              period === p.key
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Two-Column Layout ── */}
      <div className="grid grid-cols-12 gap-6 mb-6">
        {/* Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Calendario de Contenido */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Calendario de Contenido</p>
              <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-full text-xs font-bold hover:brightness-95 transition-all shadow-sm shadow-primary/20">
                <span className="material-symbols-outlined text-sm">add</span>
                Programar Post
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day, i) => (
                <div key={day} className="min-h-[140px]">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 text-center">{day}</p>
                  <div className="space-y-2">
                    {MOCK_POSTS.filter((p) => p.day === i).map((post) => (
                      <div
                        key={post.id}
                        className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 hover:border-slate-300 transition-colors cursor-pointer"
                      >
                        <div className={`w-full h-10 ${post.color} rounded-lg mb-2`} />
                        <div className="flex items-center gap-1 mb-1">
                          {post.platforms.map((pl) => platformIcon(pl))}
                        </div>
                        <p className="text-[10px] font-bold text-slate-700 leading-tight truncate">{post.product}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[9px] text-slate-400 font-medium">{post.time}</span>
                          {statusBadge(post.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance por Equipo */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Performance por Equipo</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Equipo</th>
                    <th className="px-3 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Canal</th>
                    <th className="px-3 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Vistas</th>
                    <th className="px-3 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Consultas</th>
                    <th className="px-3 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Turnos</th>
                    <th className="px-3 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-400">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {PERFORMANCE_DATA.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium">{row.equipo}</td>
                      <td className="px-3 py-3 text-xs text-slate-500">{row.canal}</td>
                      <td className="px-3 py-3 text-sm font-medium">{row.vistas.toLocaleString()}</td>
                      <td className="px-3 py-3 text-sm font-medium">{row.consultas}</td>
                      <td className="px-3 py-3 text-sm font-medium">{row.turnos}</td>
                      <td className="px-3 py-3">{estadoBadge(row.estado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Cola del Agente */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Cola del Agente 🤖</p>
            </div>

            <div className="flex items-center justify-between mb-4 mt-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSupervisado(!supervisado)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${supervisado ? "bg-primary" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${supervisado ? "left-5" : "left-0.5"}`} />
                </button>
                <span className="text-xs font-bold text-slate-600">Modo supervisado</span>
              </div>
            </div>
            {supervisado && (
              <p className="text-[10px] text-slate-400 mb-3 -mt-2">El agente pide aprobación antes de publicar</p>
            )}

            <div className="space-y-3">
              {AGENT_QUEUE.map((item) => (
                <div key={item.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-xs font-medium text-slate-700 mb-2">{item.action}</p>
                  {item.type === "pending" ? (
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full">Pendiente</span>
                      <div className="flex-1" />
                      <button className="px-2.5 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-lg hover:bg-green-200 transition-colors">
                        Aprobar
                      </button>
                      <button className="px-2.5 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-lg hover:bg-red-200 transition-colors">
                        Rechazar
                      </button>
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-bold rounded-full">Auto-aprobado</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feed Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-4">Feed Preview</p>
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <div className="w-full aspect-square bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-slate-300">smartphone</span>
              </div>
              <div className="p-3">
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  📱 iPhone 14 Pro Max 256GB{"\n"}🔋 Batería 92% | Condición A{"\n"}💰 $850 USD{"\n"}📍 iGreen - Los Ríos 1774{"\n"}{"\n"}#iPhone14Pro #iGreen #AppleBuenosAires
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-3 text-center font-medium">
              Vista previa — Se publica hoy 18:00
            </p>
          </div>

          {/* ROAS — Locked */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 text-slate-400">
              <span className="material-symbols-outlined text-xl">lock</span>
              <p className="text-xs font-bold">💰 ROAS & Pauta — Próximamente</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reglas del Agente ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          onClick={() => setReglasOpen(!reglasOpen)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
        >
          <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Reglas del Agente</p>
          <span className={`material-symbols-outlined text-slate-400 transition-transform ${reglasOpen ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </button>

        {reglasOpen && (
          <div className="px-5 pb-5 space-y-3">
            {[
              { label: "Auto-publicar stock nuevo", value: "✅ Activo", toggle: true, on: true },
              { label: "Repostear después de", value: "7 días", toggle: false },
              { label: "Reducción automática", value: "10%", toggle: false },
              { label: "Horarios de publicación", value: "10:00-12:00, 18:00-20:00", toggle: false },
              { label: "Aprobación requerida", value: "✅ Sí", toggle: true, on: true },
            ].map((rule) => (
              <div key={rule.label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{rule.label}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-500">{rule.value}</span>
                  {rule.toggle && (
                    <div className={`relative w-10 h-5 rounded-full ${rule.on ? "bg-primary" : "bg-slate-300"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm ${rule.on ? "left-5" : "left-0.5"}`} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
