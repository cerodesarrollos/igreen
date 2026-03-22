"use client";

import { useState } from "react";

/* ───── Types ───── */
interface Equipment {
  id: number;
  model: string;
  color: string;
  imei: string;
  gb: string;
  condition: "A" | "B" | "C";
  battery: number;
  priceVenta: number;
  priceCosto: number;
  saleStatus: "Disponible" | "Reservado" | "Vendido";
  ownership: "Propio" | "Consignación";
  note?: string;
}

/* ───── Data ───── */
const equipmentData: Equipment[] = [
  { id: 1, model: "iPhone 14 Pro Max", color: "Negro", imei: "353912110891234", gb: "256GB", condition: "A", battery: 96, priceVenta: 450, priceCosto: 400, saleStatus: "Disponible", ownership: "Propio" },
  { id: 2, model: "iPhone 14 Pro", color: "Morado", imei: "353912110895678", gb: "128GB", condition: "A", battery: 92, priceVenta: 380, priceCosto: 320, saleStatus: "Reservado", ownership: "Propio" },
  { id: 3, model: "iPhone 13 Pro", color: "Sierra Blue", imei: "353912110899012", gb: "256GB", condition: "B", battery: 88, priceVenta: 320, priceCosto: 260, saleStatus: "Disponible", ownership: "Consignación" },
  { id: 4, model: "iPhone 13", color: "Blanco", imei: "353912110893456", gb: "128GB", condition: "A", battery: 94, priceVenta: 260, priceCosto: 200, saleStatus: "Vendido", ownership: "Propio" },
  { id: 5, model: "iPhone 12 Pro", color: "Grafito", imei: "353912110897890", gb: "256GB", condition: "B", battery: 82, priceVenta: 220, priceCosto: 170, saleStatus: "Disponible", ownership: "Consignación" },
  { id: 6, model: "iPhone 14", color: "Azul", imei: "353912110891122", gb: "128GB", condition: "A", battery: 98, priceVenta: 340, priceCosto: 280, saleStatus: "Disponible", ownership: "Propio" },
  { id: 7, model: "iPhone 11", color: "Negro", imei: "353912110893344", gb: "64GB", condition: "C", battery: 76, priceVenta: 150, priceCosto: 100, saleStatus: "Disponible", ownership: "Propio", note: "Trade-in de Venta #012" },
  { id: 8, model: "iPhone 13 Mini", color: "Rosa", imei: "353912110895566", gb: "128GB", condition: "A", battery: 90, priceVenta: 240, priceCosto: 190, saleStatus: "Reservado", ownership: "Consignación" },
];

const appointments = [
  { time: "14:00", client: "Juan Pérez", device: "iPhone 14 Pro", status: "CONFIRMADO", badgeCls: "bg-green-100 text-green-700" },
  { time: "15:30", client: "María García", device: "iPhone 13 Pro", status: "PENDIENTE", badgeCls: "bg-amber-100 text-amber-700" },
  { time: "17:00", client: "Carlos Ruiz", device: "iPhone 12 Pro", status: "NUEVO", badgeCls: "bg-blue-100 text-blue-700" },
];

const tradeInPrices = [
  { model: "iPhone 15 Pro Max", a: 380, b: 320, c: 250 },
  { model: "iPhone 15 Pro", a: 340, b: 280, c: 220 },
  { model: "iPhone 15", a: 280, b: 230, c: 170 },
  { model: "iPhone 14 Pro Max", a: 300, b: 250, c: 190 },
  { model: "iPhone 14 Pro", a: 260, b: 210, c: 160 },
  { model: "iPhone 14", a: 200, b: 160, c: 120 },
  { model: "iPhone 13 Pro Max", a: 220, b: 180, c: 130 },
  { model: "iPhone 13 Pro", a: 200, b: 160, c: 120 },
  { model: "iPhone 13", a: 160, b: 120, c: 80 },
  { model: "iPhone 13 Mini", a: 140, b: 100, c: 60 },
  { model: "iPhone 12 Pro", a: 120, b: 90, c: 60 },
  { model: "iPhone 12", a: 100, b: 70, c: 40 },
  { model: "iPhone 11", a: 70, b: 50, c: 30 },
];

const modelOptions = [
  "iPhone 11", "iPhone 12", "iPhone 12 Pro", "iPhone 13", "iPhone 13 Mini",
  "iPhone 13 Pro", "iPhone 13 Pro Max", "iPhone 14", "iPhone 14 Pro",
  "iPhone 14 Pro Max", "iPhone 15", "iPhone 15 Pro", "iPhone 15 Pro Max",
];

/* ───── Helpers ───── */
function conditionLabel(c: "A" | "B" | "C") {
  const map = { A: "Impecable", B: "Detalles menores", C: "Uso visible" };
  return map[c];
}

function conditionColor(c: "A" | "B" | "C") {
  const map = { A: "bg-green-100 text-green-700", B: "bg-amber-100 text-amber-700", C: "bg-red-100 text-red-700" };
  return map[c];
}

function statusColor(s: Equipment["saleStatus"]) {
  const map = { Disponible: "bg-green-100 text-green-700", Reservado: "bg-amber-100 text-amber-700", Vendido: "bg-slate-200 text-slate-600" };
  return map[s];
}

function batteryBarColor(pct: number) {
  if (pct > 85) return "bg-green-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function deviceInitial(model: string) {
  const num = model.replace("iPhone ", "");
  return num.split(" ")[0];
}

function deviceCircleColor(condition: "A" | "B" | "C") {
  const map = { A: "bg-green-500", B: "bg-amber-500", C: "bg-red-400" };
  return map[condition];
}

/* ───── Tab Sections ───── */
const tabConfig = [
  { id: "equipos", label: "Equipos", icon: "phone_iphone" },
  { id: "turnos", label: "Turnos", icon: "calendar_today" },
  { id: "cargar", label: "Cargar", icon: "add_circle" },
  { id: "cotizar", label: "Cotizar", icon: "calculate" },
  { id: "resumen", label: "Resumen", icon: "bar_chart" },
];

/* ───── Main Component ───── */
export default function MobileVentasPage() {
  const [activeTab, setActiveTab] = useState("equipos");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Cargar form state
  const [cargarCapacidad, setCargarCapacidad] = useState("128GB");
  const [cargarEstado, setCargarEstado] = useState<"A" | "B" | "C">("A");
  const [cargarBateria, setCargarBateria] = useState(85);
  const [cargarPropiedad, setCargarPropiedad] = useState<"Propio" | "Consignación">("Propio");

  // Cotizar state
  const [cotizarStep, setCotizarStep] = useState(1);
  const [cotizarModel, setCotizarModel] = useState("");
  const [cotizarCondition, setCotizarCondition] = useState<"A" | "B" | "C" | "">("");

  const tabTitles: Record<string, string> = {
    equipos: "Equipos",
    turnos: "Turnos",
    cargar: "Cargar Equipo",
    cotizar: "Cotizar",
    resumen: "Resumen",
  };

  // Filtered equipment
  const filteredEquipment = equipmentData.filter((eq) => {
    const matchStatus =
      statusFilter === "Todos" ||
      (statusFilter === "Disponibles" && eq.saleStatus === "Disponible") ||
      (statusFilter === "Reservados" && eq.saleStatus === "Reservado") ||
      (statusFilter === "Vendidos" && eq.saleStatus === "Vendido");
    const matchSearch =
      !searchQuery ||
      eq.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.imei.includes(searchQuery);
    return matchStatus && matchSearch;
  });

  const counts = {
    Todos: equipmentData.length,
    Disponibles: equipmentData.filter((e) => e.saleStatus === "Disponible").length,
    Reservados: equipmentData.filter((e) => e.saleStatus === "Reservado").length,
    Vendidos: equipmentData.filter((e) => e.saleStatus === "Vendido").length,
  };

  function getCotizarPrice() {
    if (!cotizarModel || !cotizarCondition) return null;
    const row = tradeInPrices.find((r) => r.model === cotizarModel);
    if (!row) return null;
    const key = cotizarCondition.toLowerCase() as "a" | "b" | "c";
    return row[key];
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <span className="text-lg font-black tracking-tighter text-[#34C759]">iGreen</span>
        <span className="text-base font-bold">{tabTitles[activeTab]}</span>
        <button className="relative p-2">
          <span className="material-symbols-outlined text-slate-500">notifications</span>
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">2</span>
        </button>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto pb-20">
        {/* ══════ TAB 1: EQUIPOS ══════ */}
        {activeTab === "equipos" && (
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por modelo, IMEI..."
                className="w-full pl-10 pr-4 py-3 bg-white rounded-2xl border border-slate-200 text-base focus:outline-none focus:ring-2 focus:ring-[#34C759]/30"
              />
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {(["Todos", "Disponibles", "Reservados", "Vendidos"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    statusFilter === f
                      ? "bg-[#34C759] text-white shadow-md"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  {f} ({counts[f]})
                </button>
              ))}
            </div>

            {/* Equipment cards */}
            <div className="space-y-3">
              {filteredEquipment.map((eq) => (
                <div key={eq.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Main card */}
                  <button
                    onClick={() => setExpandedCard(expandedCard === eq.id ? null : eq.id)}
                    className="w-full p-4 flex items-center gap-3 text-left"
                  >
                    {/* Left circle */}
                    <div className={`w-12 h-12 rounded-xl ${deviceCircleColor(eq.condition)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white font-black text-lg">{deviceInitial(eq.model)}</span>
                    </div>

                    {/* Center info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold truncate">{eq.model}</p>
                      <p className="text-sm text-slate-500">{eq.color} · {eq.gb}</p>
                      {/* Battery bar */}
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                          <div className={`h-full rounded-full ${batteryBarColor(eq.battery)}`} style={{ width: `${eq.battery}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{eq.battery}%</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${conditionColor(eq.condition)}`}>
                          {eq.condition}
                        </span>
                      </div>
                    </div>

                    {/* Right: price + status */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-black">${eq.priceVenta}</p>
                      <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full mt-1 ${statusColor(eq.saleStatus)}`}>
                        {eq.saleStatus}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expandedCard === eq.id && (
                    <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
                      {/* IMEI */}
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-500">IMEI</span>
                        <span className="text-sm font-mono font-bold">{eq.imei}</span>
                      </div>

                      {/* Prices */}
                      <div className="bg-white rounded-xl p-3 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Precio costo</span>
                          <span className="text-sm font-bold">${eq.priceCosto} USD</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-slate-500">Precio venta</span>
                          <span className="text-sm font-bold">${eq.priceVenta} USD</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-100">
                          <span className="text-sm font-bold text-slate-500">Ganancia</span>
                          <span className="text-base font-black text-green-600">${eq.priceVenta - eq.priceCosto} USD</span>
                        </div>
                      </div>

                      {/* Ownership + Condition */}
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${eq.ownership === "Propio" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>
                          {eq.ownership}
                        </span>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${conditionColor(eq.condition)}`}>
                          {eq.condition} — {conditionLabel(eq.condition)}
                        </span>
                      </div>

                      {eq.note && (
                        <p className="text-xs text-slate-500 italic">{eq.note}</p>
                      )}

                      {/* Photos placeholder */}
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fotos</p>
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="aspect-square rounded-xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center">
                              <span className="material-symbols-outlined text-slate-300">image</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {eq.saleStatus === "Disponible" && (
                        <div className="flex gap-3">
                          <button className="flex-1 py-3 bg-amber-100 text-amber-700 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-lg">bookmark</span>
                            Reservar
                          </button>
                          <button className="flex-1 py-3 bg-[#34C759] text-white rounded-2xl text-sm font-bold shadow-md flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-lg">sell</span>
                            Registrar Venta
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════ TAB 2: TURNOS ══════ */}
        {activeTab === "turnos" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Turnos de Hoy</h2>
                <p className="text-sm text-slate-500">Dom 22 Mar</p>
              </div>
              <span className="text-sm font-bold text-[#34C759] bg-green-50 px-3 py-1 rounded-full">3 turnos</span>
            </div>

            {/* Next appointment alert */}
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <span className="material-symbols-outlined text-amber-600">schedule</span>
              <p className="text-sm font-medium text-amber-800">Próximo turno en 45 min</p>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              {appointments.map((apt, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className="flex items-start gap-4">
                    {/* Time */}
                    <div className="flex-shrink-0 text-center">
                      <p className="text-2xl font-black text-slate-800">{apt.time.split(":")[0]}</p>
                      <p className="text-xs font-bold text-slate-400">:{apt.time.split(":")[1]}</p>
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <p className="text-base font-bold">{apt.client}</p>
                      <p className="text-sm text-slate-500">{apt.device}</p>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full ${apt.badgeCls}`}>
                        {apt.status}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-4">
                    <button className="flex-1 py-2.5 bg-[#25D366] text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-lg">chat</span>
                      WhatsApp
                    </button>
                    <button className="flex-1 py-2.5 bg-white border-2 border-red-200 text-red-500 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-lg">close</span>
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full py-3.5 bg-white border-2 border-slate-200 rounded-2xl text-sm font-bold text-slate-600 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">date_range</span>
              Ver semana completa
            </button>
          </div>
        )}

        {/* ══════ TAB 3: CARGAR EQUIPO ══════ */}
        {activeTab === "cargar" && (
          <div className="p-4 space-y-5">
            <h2 className="text-xl font-bold">Cargar Equipo Nuevo</h2>

            {/* IMEI */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">IMEI</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escaneá o ingresá el IMEI"
                  className="flex-1 px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#34C759]/30"
                />
                <button className="w-14 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
                  <span className="material-symbols-outlined text-slate-600">photo_camera</span>
                </button>
              </div>
            </div>

            {/* Modelo */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">Modelo</label>
              <select className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#34C759]/30 appearance-none">
                <option value="">Seleccionar modelo...</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Capacidad */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">Capacidad</label>
              <div className="flex gap-2 flex-wrap">
                {["64GB", "128GB", "256GB", "512GB", "1TB"].map((cap) => (
                  <button
                    key={cap}
                    onClick={() => setCargarCapacidad(cap)}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                      cargarCapacidad === cap
                        ? "bg-[#34C759] text-white shadow-md"
                        : "bg-white border border-slate-200 text-slate-600"
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">Color</label>
              <input
                type="text"
                placeholder="Ej: Negro Espacial"
                className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#34C759]/30"
              />
            </div>

            {/* Estado */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">Estado del equipo</label>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { val: "A" as const, label: "Impecable", icon: "verified" },
                  { val: "B" as const, label: "Detalles menores", icon: "thumbs_up_down" },
                  { val: "C" as const, label: "Uso visible", icon: "warning" },
                ]).map((s) => (
                  <button
                    key={s.val}
                    onClick={() => setCargarEstado(s.val)}
                    className={`p-4 rounded-2xl border-2 text-center transition-all ${
                      cargarEstado === s.val
                        ? "border-[#34C759] bg-green-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${cargarEstado === s.val ? "text-[#34C759]" : "text-slate-400"}`}>{s.icon}</span>
                    <p className="text-lg font-black mt-1">{s.val}</p>
                    <p className="text-[10px] text-slate-500 font-medium">{s.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Batería */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">Batería: {cargarBateria}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={cargarBateria}
                onChange={(e) => setCargarBateria(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-full appearance-none accent-[#34C759]"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Detalles/Fallas */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">Detalles / Fallas</label>
              <textarea
                placeholder="Describí los detalles o fallas del equipo..."
                rows={3}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-[#34C759]/30 resize-none"
              />
            </div>

            {/* Precios */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">Precio de costo</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">USD</span>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full pl-14 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#34C759]/30"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 mb-1.5 block">Precio de venta</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">USD</span>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full pl-14 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-[#34C759]/30"
                  />
                </div>
              </div>
            </div>

            {/* Propiedad */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">Propiedad</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCargarPropiedad("Propio")}
                  className={`py-3.5 rounded-2xl text-sm font-bold transition-all ${
                    cargarPropiedad === "Propio"
                      ? "bg-[#34C759] text-white shadow-md"
                      : "bg-white border border-slate-200 text-slate-600"
                  }`}
                >
                  Stock Propio
                </button>
                <button
                  onClick={() => setCargarPropiedad("Consignación")}
                  className={`py-3.5 rounded-2xl text-sm font-bold transition-all ${
                    cargarPropiedad === "Consignación"
                      ? "bg-[#34C759] text-white shadow-md"
                      : "bg-white border border-slate-200 text-slate-600"
                  }`}
                >
                  Consignación
                </button>
              </div>
            </div>

            {/* Fotos */}
            <div>
              <label className="text-sm font-bold text-slate-700 mb-1.5 block">Fotos</label>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((n) => (
                  <button key={n} className="aspect-square rounded-2xl bg-white border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                    <span className="material-symbols-outlined text-3xl text-slate-300">photo_camera</span>
                    <span className="text-xs text-slate-400 font-medium">Agregar foto</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button className="w-full py-4 bg-[#34C759] text-white rounded-2xl text-base font-bold shadow-lg shadow-green-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <span className="material-symbols-outlined text-xl">add_circle</span>
              Cargar Equipo
            </button>
          </div>
        )}

        {/* ══════ TAB 4: COTIZAR ══════ */}
        {activeTab === "cotizar" && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold">Cotización Rápida</h2>

            {/* Steps indicator */}
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    cotizarStep >= s ? "bg-[#34C759] text-white" : "bg-slate-200 text-slate-500"
                  }`}>
                    {s}
                  </div>
                  {s < 3 && <div className={`w-8 h-0.5 ${cotizarStep > s ? "bg-[#34C759]" : "bg-slate-200"}`} />}
                </div>
              ))}
            </div>

            {/* Step 1: Select model */}
            {cotizarStep === 1 && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-500">Seleccioná el modelo</p>
                <div className="space-y-2">
                  {tradeInPrices.map((row) => (
                    <button
                      key={row.model}
                      onClick={() => { setCotizarModel(row.model); setCotizarStep(2); }}
                      className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200 text-left hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-slate-500">smartphone</span>
                      </div>
                      <span className="text-base font-bold">{row.model}</span>
                      <span className="material-symbols-outlined ml-auto text-slate-300">chevron_right</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Select condition */}
            {cotizarStep === 2 && (
              <div className="space-y-3">
                <button onClick={() => setCotizarStep(1)} className="flex items-center gap-1 text-sm font-bold text-[#34C759]">
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                  {cotizarModel}
                </button>
                <p className="text-sm font-bold text-slate-500">Seleccioná el estado</p>
                <div className="space-y-3">
                  {([
                    { val: "A" as const, label: "Impecable", desc: "Sin marcas, pantalla perfecta, batería >85%", icon: "verified", color: "border-green-300 bg-green-50" },
                    { val: "B" as const, label: "Detalles menores", desc: "Pequeños rayones, funcionamiento perfecto", icon: "thumbs_up_down", color: "border-amber-300 bg-amber-50" },
                    { val: "C" as const, label: "Uso visible", desc: "Marcas notorias, posibles detalles funcionales", icon: "warning", color: "border-red-300 bg-red-50" },
                  ]).map((s) => (
                    <button
                      key={s.val}
                      onClick={() => { setCotizarCondition(s.val); setCotizarStep(3); }}
                      className={`w-full p-5 rounded-2xl border-2 text-left transition-all ${s.color}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                        <div>
                          <p className="text-lg font-black">Estado {s.val} — {s.label}</p>
                          <p className="text-sm text-slate-500 mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Result */}
            {cotizarStep === 3 && (
              <div className="space-y-4">
                <button onClick={() => setCotizarStep(2)} className="flex items-center gap-1 text-sm font-bold text-[#34C759]">
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                  Cambiar estado
                </button>

                {/* Result card */}
                <div className="bg-white rounded-2xl border-2 border-[#34C759] p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-3xl text-[#34C759]">smartphone</span>
                  </div>
                  <p className="text-base text-slate-500">{cotizarModel} · Estado {cotizarCondition}</p>
                  <p className="text-4xl font-black text-[#34C759] mt-2">${getCotizarPrice()} USD</p>
                </div>

                <button className="w-full py-3.5 bg-[#25D366] text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-md">
                  <span className="material-symbols-outlined text-lg">chat</span>
                  Solicitar Fotos al Cliente
                </button>

                <button
                  onClick={() => { setCotizarStep(1); setCotizarModel(""); setCotizarCondition(""); }}
                  className="w-full py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600"
                >
                  Nueva cotización
                </button>
              </div>
            )}

            {/* Full pricing table */}
            <div className="mt-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Tabla de precios completa</h3>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-xs font-bold text-slate-500">Modelo</th>
                        <th className="px-3 py-3 text-xs font-bold text-green-600 text-center">A</th>
                        <th className="px-3 py-3 text-xs font-bold text-amber-600 text-center">B</th>
                        <th className="px-3 py-3 text-xs font-bold text-red-600 text-center">C</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {tradeInPrices.map((row) => (
                        <tr key={row.model} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-sm">{row.model}</td>
                          <td className="px-3 py-3 text-center font-bold text-green-700">${row.a}</td>
                          <td className="px-3 py-3 text-center font-bold text-amber-700">${row.b}</td>
                          <td className="px-3 py-3 text-center font-bold text-red-600">${row.c}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════ TAB 5: RESUMEN ══════ */}
        {activeTab === "resumen" && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold">Resumen del Mes</h2>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Vendidos este mes", value: "24", icon: "sell", color: "text-blue-600", bgIcon: "bg-blue-50" },
                { label: "Ganancia total", value: "$2,450", icon: "trending_up", color: "text-green-600", bgIcon: "bg-green-50", suffix: "USD" },
                { label: "Equipos en stock", value: "18", icon: "phone_iphone", color: "text-slate-600", bgIcon: "bg-slate-100" },
                { label: "Reservados", value: "3", icon: "bookmark", color: "text-amber-600", bgIcon: "bg-amber-50" },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                  <div className={`w-10 h-10 ${kpi.bgIcon} rounded-xl flex items-center justify-center mb-3`}>
                    <span className={`material-symbols-outlined ${kpi.color}`}>{kpi.icon}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
                  <p className="text-2xl font-black mt-0.5">
                    {kpi.value}
                    {kpi.suffix && <span className="text-sm font-bold text-slate-400 ml-1">{kpi.suffix}</span>}
                  </p>
                </div>
              ))}
            </div>

            {/* Mini chart */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-bold mb-4">Ventas por semana</h3>
              <div className="flex items-end gap-3 h-32">
                {[
                  { week: "S1", value: 5, max: 8 },
                  { week: "S2", value: 7, max: 8 },
                  { week: "S3", value: 8, max: 8 },
                  { week: "S4", value: 4, max: 8 },
                ].map((bar) => (
                  <div key={bar.week} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold">{bar.value}</span>
                    <div className="w-full bg-slate-100 rounded-lg overflow-hidden" style={{ height: "100px" }}>
                      <div
                        className="w-full bg-[#34C759] rounded-lg mt-auto"
                        style={{ height: `${(bar.value / bar.max) * 100}%`, marginTop: `${100 - (bar.value / bar.max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">{bar.week}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Consignación card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-purple-600">account_balance</span>
                <h3 className="text-base font-bold">Consignación — Salvador</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-black">4</p>
                  <p className="text-xs text-slate-500">En stock</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black">2</p>
                  <p className="text-xs text-slate-500">Vendidos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-amber-600">$540</p>
                  <p className="text-xs text-slate-500">Por rendir</p>
                </div>
              </div>
              <button className="w-full py-3 bg-slate-100 rounded-2xl text-sm font-bold text-slate-600 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-lg">summarize</span>
                Generar Reporte
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 h-16 flex items-center justify-around px-2 safe-bottom">
        {tabConfig.map((tab) => {
          const isActive = activeTab === tab.id;
          const isCenter = tab.id === "cargar";
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 transition-all ${
                isCenter ? "" : ""
              }`}
            >
              {isCenter ? (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center -mt-4 shadow-lg transition-all ${
                  isActive ? "bg-[#34C759] shadow-green-500/30" : "bg-[#34C759] shadow-green-500/20"
                }`}>
                  <span className="material-symbols-outlined text-white text-2xl">add_circle</span>
                </div>
              ) : (
                <span className={`material-symbols-outlined text-2xl transition-colors ${
                  isActive ? "text-[#34C759]" : "text-slate-400"
                }`}>
                  {tab.icon}
                </span>
              )}
              <span className={`text-[10px] font-bold transition-colors ${
                isActive ? "text-[#34C759]" : "text-slate-400"
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
