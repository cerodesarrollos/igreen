"use client";

import { useState } from "react";

/* ───── types ───── */
interface Equipment {
  model: string;
  color: string;
  imei: string;
  gb: string;
  condition: "A" | "B" | "C";
  battery: number;
  price: string;
  saleStatus: "Disponible" | "Reservado" | "Vendido";
  ownership: "Propio" | "Consignación";
  note?: string;
}

/* ───── data ───── */
const equipmentData: Equipment[] = [
  { model: "iPhone 14 Pro Max", color: "Negro", imei: "353912110891234", gb: "256GB", condition: "A", battery: 96, price: "$450 USD", saleStatus: "Disponible", ownership: "Propio" },
  { model: "iPhone 14 Pro", color: "Morado", imei: "353912110895678", gb: "128GB", condition: "A", battery: 92, price: "$380 USD", saleStatus: "Reservado", ownership: "Propio" },
  { model: "iPhone 13 Pro", color: "Sierra Blue", imei: "353912110899012", gb: "256GB", condition: "B", battery: 88, price: "$320 USD", saleStatus: "Disponible", ownership: "Consignación" },
  { model: "iPhone 13", color: "Blanco", imei: "353912110893456", gb: "128GB", condition: "A", battery: 94, price: "$260 USD", saleStatus: "Vendido", ownership: "Propio" },
  { model: "iPhone 12 Pro", color: "Grafito", imei: "353912110897890", gb: "256GB", condition: "B", battery: 82, price: "$220 USD", saleStatus: "Disponible", ownership: "Consignación" },
  { model: "iPhone 14", color: "Azul", imei: "353912110891122", gb: "128GB", condition: "A", battery: 98, price: "$340 USD", saleStatus: "Disponible", ownership: "Propio" },
  { model: "iPhone 11", color: "Negro", imei: "353912110893344", gb: "64GB", condition: "C", battery: 76, price: "$150 USD", saleStatus: "Disponible", ownership: "Propio", note: "Trade-in de Venta #012" },
  { model: "iPhone 13 Mini", color: "Rosa", imei: "353912110895566", gb: "128GB", condition: "A", battery: 90, price: "$240 USD", saleStatus: "Reservado", ownership: "Consignación" },
];

const appointments = [
  { time: "14:00", device: "iPhone 14 Pro", client: "Juan Pérez", status: "CONFIRMADO", color: "bg-green-100 text-green-700" },
  { time: "15:30", device: "iPhone 13 Pro", client: "María García", status: "PENDIENTE", color: "bg-amber-100 text-amber-700" },
  { time: "17:00", device: "iPhone 12 Pro", client: "Carlos Ruiz", status: "NUEVO", color: "bg-blue-100 text-blue-700" },
];

/* ───── helpers ───── */
function maskImei(imei: string) {
  return "•••••" + imei.slice(-4);
}

function conditionBadge(c: "A" | "B" | "C") {
  const map = {
    A: { label: "Impecable", cls: "bg-green-100 text-green-700" },
    B: { label: "Detalles menores", cls: "bg-amber-100 text-amber-700" },
    C: { label: "Uso visible", cls: "bg-red-100 text-red-700" },
  };
  const m = map[c];
  return (
    <span className={`px-2 py-0.5 ${m.cls} text-[10px] font-bold rounded-full whitespace-nowrap`}>
      {c} — {m.label}
    </span>
  );
}

function batteryColor(pct: number) {
  if (pct > 85) return "text-green-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-500";
}

function saleStatusBadge(s: Equipment["saleStatus"]) {
  const map = {
    Disponible: "bg-green-100 text-green-700",
    Reservado: "bg-amber-100 text-amber-700",
    Vendido: "bg-slate-200 text-slate-600",
  };
  return (
    <span className={`px-2.5 py-0.5 ${map[s]} text-[10px] font-bold rounded-full`}>
      {s}
    </span>
  );
}

/* ───── component ───── */
export default function VentasPage() {
  const [statusFilter, setStatusFilter] = useState<string>("Disponibles");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");

  const statusFilters = ["Todos", "Disponibles", "Reservados", "Vendidos"];

  return (
    <>
      {/* ── Header ── */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ventas de Equipos</h2>
          <p className="text-on-surface-variant text-sm mt-1">
            Gestión de inventario, turnos y operaciones de venta
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm shadow-md shadow-primary/20">
            <span className="material-symbols-outlined text-lg">add</span> Cargar Equipo
          </button>
          <button className="flex items-center gap-2 px-6 py-3 border-2 border-primary text-primary rounded-full font-bold text-sm hover:bg-primary/5 transition-all">
            <span className="material-symbols-outlined text-lg">point_of_sale</span> Nueva Venta
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Equipos Disponibles", value: "18", icon: "phone_iphone", iconBg: "bg-green-50", iconColor: "text-green-600" },
          { label: "Reservados", value: "3", icon: "event", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
          { label: "Vendidos este mes", value: "24", icon: "sell", iconBg: "bg-blue-50", iconColor: "text-blue-600", change: "+15%", changeColor: "text-blue-600 bg-blue-100" },
          { label: "Ganancia del mes", value: "$2,450 USD", icon: "trending_up", iconBg: "bg-green-50", iconColor: "text-green-600", change: "+8.3%", changeColor: "text-green-600 bg-green-100" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 ${kpi.iconBg} rounded-lg`}>
                <span className={`material-symbols-outlined ${kpi.iconColor}`}>{kpi.icon}</span>
              </div>
              {kpi.change && (
                <span className={`text-[10px] font-bold ${kpi.changeColor} px-2 py-0.5 rounded-full`}>{kpi.change}</span>
              )}
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-medium mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold tracking-tight">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </section>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-12 gap-8">
        {/* ── Left: Catalog Table ── */}
        <div className="col-span-12 lg:col-span-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Card Header */}
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Catálogo de Equipos</h3>
                {/* Filter Chips */}
                <div className="flex bg-slate-100 p-1 rounded-full">
                  {statusFilters.map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
                        statusFilter === f ? "bg-white shadow-sm text-on-surface" : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search + Ownership Toggle */}
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-cool-grey">search</span>
                  <input
                    className="w-full pl-12 pr-6 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                    placeholder="Buscar por IMEI, modelo o cliente..."
                    type="text"
                  />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-full">
                  <button
                    onClick={() => setOwnershipFilter("all")}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${ownershipFilter === "all" ? "bg-white shadow-sm" : "text-on-surface-variant"}`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setOwnershipFilter("Propio")}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${ownershipFilter === "Propio" ? "bg-white shadow-sm" : "text-on-surface-variant"}`}
                  >
                    Stock Propio
                  </button>
                  <button
                    onClick={() => setOwnershipFilter("Consignación")}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${ownershipFilter === "Consignación" ? "bg-white shadow-sm" : "text-on-surface-variant"}`}
                  >
                    Consignación
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Equipo</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">IMEI</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Capacidad</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Estado Equipo</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Batería</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Precio Venta</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Estado</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {equipmentData.map((eq) => (
                    <tr key={eq.imei} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-lg text-cool-grey">smartphone</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold">{eq.model}</p>
                            <p className="text-[10px] text-on-surface-variant">{eq.color}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-cool-grey">{maskImei(eq.imei)}</td>
                      <td className="px-4 py-4 text-sm font-medium">{eq.gb}</td>
                      <td className="px-4 py-4">{conditionBadge(eq.condition)}</td>
                      <td className="px-4 py-4">
                        <span className={`text-sm font-bold ${batteryColor(eq.battery)}`}>{eq.battery}%</span>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold">{eq.price}</td>
                      <td className="px-4 py-4">{saleStatusBadge(eq.saleStatus)}</td>
                      <td className="px-4 py-4 text-right">
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 flex justify-between items-center text-xs font-medium text-cool-grey border-t border-slate-100">
              <span>Mostrando 8 de 18 equipos</span>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-bold text-primary">1</button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100">2</button>
                <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-slate-100">3</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Column ── */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Card 1: Turnos de Hoy */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_today</span>
                <h3 className="text-lg font-bold">Turnos de Hoy</h3>
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">3 turnos</span>
            </div>

            {/* Next appointment notice */}
            <div className="flex items-center gap-2 mb-5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-amber-600 text-lg">schedule</span>
              <p className="text-xs font-medium text-amber-800">Próximo turno en 45 min</p>
            </div>

            <div className="space-y-3">
              {appointments.map((apt, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="text-center flex-shrink-0">
                    <p className="text-sm font-black">{apt.time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{apt.device}</p>
                    <p className="text-[10px] text-on-surface-variant">{apt.client}</p>
                  </div>
                  <span className={`px-2 py-0.5 ${apt.color} text-[9px] font-bold rounded-full whitespace-nowrap`}>
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>

            <button className="flex items-center gap-1 text-xs font-bold text-primary mt-4 hover:underline">
              Ver calendario completo
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          {/* Card 2: Detalle de Equipo */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 sticky top-24">
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-cool-grey mb-4">Detalle de Equipo</h3>

            {/* Device header */}
            <div className="flex items-center gap-4 mb-5">
              <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-cool-grey">smartphone</span>
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-wider">iPhone 14 Pro Max</p>
                <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">353912110891234</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: "Capacidad", value: "256GB" },
                { label: "Color", value: "Negro Espacial" },
                { label: "Estado", value: "A — Impecable" },
                { label: "Batería", value: "96%" },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 p-3 rounded-xl">
                  <p className="text-[10px] text-cool-grey uppercase font-bold mb-0.5">{item.label}</p>
                  <p className="text-sm font-bold">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Precios */}
            <div className="mb-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Precios</h4>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">Costo</span>
                  <span className="text-xs font-bold">$400 USD</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">Venta</span>
                  <span className="text-xs font-bold">$450 USD</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-on-surface-variant">Ganancia</span>
                  <span className="text-sm font-black text-green-600">$50 USD</span>
                </div>
              </div>
            </div>

            {/* Propiedad */}
            <div className="mb-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Propiedad</h4>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                Stock Propio
              </span>
            </div>

            {/* Detalles */}
            <div className="mb-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Detalles</h4>
              <p className="text-xs text-on-surface-variant leading-relaxed">Sin detalles. Equipo en perfecto estado.</p>
            </div>

            {/* Fotos */}
            <div className="mb-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Fotos</h4>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="aspect-square rounded-lg bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg text-slate-300">image</span>
                  </div>
                ))}
              </div>
              <button className="flex items-center gap-1 text-xs font-bold text-primary mt-2 hover:underline">
                <span className="material-symbols-outlined text-sm">add_photo_alternate</span> Agregar foto
              </button>
            </div>

            {/* Garantía */}
            <div className="mb-5 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-blue-600 text-lg">verified_user</span>
              <p className="text-xs font-medium text-blue-800">Garantía: 90 días desde la venta</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button className="flex-1 py-3 bg-slate-200 rounded-full text-xs font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm">edit</span> Editar
              </button>
              <button className="flex-1 py-3 bg-primary text-white rounded-full text-xs font-bold shadow-md shadow-primary/20 hover:brightness-95 transition-all flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-sm">sell</span> Registrar Venta
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Trade-in Pricing ── */}
      <section className="mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <span className="material-symbols-outlined text-green-600">swap_horiz</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Cotización Trade-in</h3>
                <p className="text-on-surface-variant text-xs mt-0.5">Referencia de precios para cotizar equipos en parte de pago</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">Última actualización: 22 Mar 2026</span>
              <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-200 rounded-full text-xs font-bold hover:bg-slate-300 transition-colors">
                <span className="material-symbols-outlined text-sm">edit</span> Editar Precios
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Modelo</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey bg-green-50">Estado A — Impecable</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey bg-amber-50">Estado B — Detalles menores</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey bg-red-50">Estado C — Uso visible</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Batería mín.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { model: "iPhone 15 Pro Max", a: 380, b: 320, c: 250, bat: 80 },
                  { model: "iPhone 15 Pro", a: 340, b: 280, c: 220, bat: 80 },
                  { model: "iPhone 15", a: 280, b: 230, c: 170, bat: 80 },
                  { model: "iPhone 14 Pro Max", a: 300, b: 250, c: 190, bat: 75 },
                  { model: "iPhone 14 Pro", a: 260, b: 210, c: 160, bat: 75 },
                  { model: "iPhone 14", a: 200, b: 160, c: 120, bat: 75 },
                  { model: "iPhone 13 Pro Max", a: 220, b: 180, c: 130, bat: 70 },
                  { model: "iPhone 13 Pro", a: 200, b: 160, c: 120, bat: 70 },
                  { model: "iPhone 13", a: 160, b: 120, c: 80, bat: 70 },
                  { model: "iPhone 12 Pro", a: 120, b: 90, c: 60, bat: 65 },
                  { model: "iPhone 12", a: 100, b: 70, c: 40, bat: 65 },
                  { model: "iPhone 11", a: 70, b: 50, c: 30, bat: 60 },
                ].map((row, i) => (
                  <tr key={row.model} className={`hover:bg-slate-50 transition-colors ${i % 2 === 1 ? "bg-slate-50/40" : ""}`}>
                    <td className="px-6 py-3.5 text-sm font-bold">{row.model}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-green-700">${row.a}</span>
                      <span className="text-[10px] text-slate-400 ml-1">USD</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-amber-700">${row.b}</span>
                      <span className="text-[10px] text-slate-400 ml-1">USD</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-bold text-red-600">${row.c}</span>
                      <span className="text-[10px] text-slate-400 ml-1">USD</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-slate-400">battery_5_bar</span>
                        <span className="text-sm font-bold">{row.bat}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Info Box */}
          <div className="mt-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-blue-600 text-lg mt-0.5">smart_toy</span>
            <p className="text-xs text-blue-800 leading-relaxed">
              El agente IA usa esta tabla para cotizar equipos automáticamente. Cuando un cliente envía fotos, GPT Vision analiza el estado y cotiza según estos valores de referencia.
            </p>
          </div>
        </div>
      </section>

      {/* ── Financial Summary: Consignación ── */}
      <section className="mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_balance</span>
              <h3 className="text-lg font-bold">Rendición — Stock en Consignación</h3>
            </div>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-200 rounded-full text-xs font-bold hover:bg-slate-300 transition-colors">
              <span className="material-symbols-outlined text-sm">summarize</span> Generar Reporte
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Proveedor</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Equipos en Stock</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Equipos Vendidos</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Costo Total</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Vendido Total</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Por Rendir</th>
                </tr>
              </thead>
              <tbody>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold">Salvador</td>
                  <td className="px-4 py-4 text-sm font-medium">4</td>
                  <td className="px-4 py-4 text-sm font-medium">2</td>
                  <td className="px-4 py-4 text-sm font-medium">$1,080 USD</td>
                  <td className="px-4 py-4 text-sm font-medium">$540 USD</td>
                  <td className="px-4 py-4 text-sm font-black text-amber-600">$540 USD</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-xs text-cool-grey">
            <span className="material-symbols-outlined text-sm">info</span>
            Última rendición: 15 Mar 2026 · Próxima: 22 Mar 2026
          </div>
        </div>
      </section>
    </>
  );
}
