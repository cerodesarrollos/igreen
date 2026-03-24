"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ───── Types ───── */
interface Product {
  id: string;
  imei: string;
  model: string;
  brand: string;
  capacity: string;
  color: string;
  condition: "A" | "B" | "C";
  battery_health: number;
  status: "disponible" | "reservado" | "vendido";
  origin: "propio" | "consignacion";
  consignment_owner: string | null;
  cost_price: number | null;
  sale_price: number | null;
  defects: string | null;
  notes: string | null;
  is_new: boolean;
  created_at: string;
}

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string | null;
  scheduled_at: string;
  status: "pendiente" | "confirmado" | "completado" | "no_show" | "cancelado";
  notes: string | null;
  product_id: string | null;
  product?: Product | null;
}

interface TradeInPrice {
  id: string;
  model: string;
  condition: "A" | "B" | "C";
  min_battery: number;
  price_usd: number;
}

type Tab = "inicio" | "stock" | "turnos" | "tradein" | "mas";

/* ───── Helpers ───── */
function conditionLabel(c: "A" | "B" | "C") {
  return { A: "Impecable", B: "Detalles menores", C: "Uso visible" }[c];
}

function conditionColor(c: "A" | "B" | "C") {
  return { A: "bg-green-100 text-green-700", B: "bg-amber-100 text-amber-700", C: "bg-red-100 text-red-700" }[c];
}

function statusColor(s: Product["status"]) {
  return { disponible: "bg-green-100 text-green-700", reservado: "bg-amber-100 text-amber-700", vendido: "bg-slate-200 text-slate-600" }[s];
}

function statusLabel(s: Product["status"]) {
  return { disponible: "Disponible", reservado: "Reservado", vendido: "Vendido" }[s];
}

function appointmentStatusColor(s: Appointment["status"]) {
  return {
    pendiente: "bg-amber-100 text-amber-700",
    confirmado: "bg-green-100 text-green-700",
    completado: "bg-blue-100 text-blue-700",
    no_show: "bg-red-100 text-red-700",
    cancelado: "bg-slate-200 text-slate-600",
  }[s];
}

function appointmentStatusLabel(s: Appointment["status"]) {
  return {
    pendiente: "Pendiente",
    confirmado: "Confirmado",
    completado: "Completado",
    no_show: "No Show",
    cancelado: "Cancelado",
  }[s];
}

function batteryBarColor(pct: number) {
  if (pct > 85) return "bg-green-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function deviceInitial(model: string) {
  return model.replace("iPhone ", "").split(" ")[0];
}

function deviceCircleColor(condition: "A" | "B" | "C") {
  return { A: "bg-green-500", B: "bg-amber-500", C: "bg-red-400" }[condition];
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  return { start, end };
}

/* ───── Tab Config ───── */
const tabConfig: { id: Tab; label: string; icon: string }[] = [
  { id: "inicio", label: "Inicio", icon: "home" },
  { id: "stock", label: "Stock", icon: "inventory_2" },
  { id: "turnos", label: "Turnos", icon: "calendar_today" },
  { id: "tradein", label: "Trade-in", icon: "swap_horiz" },
  { id: "mas", label: "Más", icon: "more_horiz" },
];

/* ───── Main Component ───── */
export default function MobileVentasPage() {
  const [activeTab, setActiveTab] = useState<Tab>("inicio");

  // ── Inicio state ──
  const [stockCount, setStockCount] = useState(0);
  const [todaySalesCount, setTodaySalesCount] = useState(0);
  const [todaySalesTotal, setTodaySalesTotal] = useState(0);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [lowBatteryCount, setLowBatteryCount] = useState(0);

  // ── Stock state ──
  const [products, setProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ── Turnos state ──
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [updatingAppointment, setUpdatingAppointment] = useState<string | null>(null);

  // ── Trade-in state ──
  const [tradeInPrices, setTradeInPrices] = useState<TradeInPrice[]>([]);
  const [cotizarStep, setCotizarStep] = useState(1);
  const [cotizarModel, setCotizarModel] = useState("");
  const [cotizarCondition, setCotizarCondition] = useState<"A" | "B" | "C" | "">("");
  const [loadingPrices, setLoadingPrices] = useState(false);

  // ── Fetch helpers ──
  const fetchDashboard = useCallback(async () => {
    const { start, end } = todayRange();

    const [productsRes, salesRes, appointmentsRes, lowBatteryRes] = await Promise.all([
      supabase.from("ig_products").select("id", { count: "exact" }).eq("status", "disponible"),
      supabase.from("ig_sales").select("id, sale_price, cost_price").gte("sold_at", start).lt("sold_at", end),
      supabase.from("ig_appointments").select("*").gte("scheduled_at", start).lt("scheduled_at", end).order("scheduled_at"),
      supabase.from("ig_products").select("id", { count: "exact" }).eq("status", "disponible").lt("battery_health", 80),
    ]);

    setStockCount(productsRes.count ?? 0);
    setTodaySalesCount(salesRes.data?.length ?? 0);
    setTodaySalesTotal(salesRes.data?.reduce((sum, s) => sum + (s.sale_price - s.cost_price), 0) ?? 0);
    setTodayAppointments((appointmentsRes.data as Appointment[]) ?? []);
    setLowBatteryCount(lowBatteryRes.count ?? 0);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    let query = supabase.from("ig_products").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "todos") query = query.eq("status", statusFilter);
    if (searchQuery) query = query.or(`model.ilike.%${searchQuery}%,imei.ilike.%${searchQuery}%`);
    const { data } = await query;
    setProducts((data as Product[]) ?? []);
    setLoadingProducts(false);
  }, [statusFilter, searchQuery]);

  const fetchAppointments = useCallback(async () => {
    setLoadingAppointments(true);
    const { start, end } = todayRange();
    const { data } = await supabase
      .from("ig_appointments")
      .select("*")
      .gte("scheduled_at", start)
      .lt("scheduled_at", end)
      .order("scheduled_at");
    setAppointments((data as Appointment[]) ?? []);
    setLoadingAppointments(false);
  }, []);

  const fetchTradeInPrices = useCallback(async () => {
    setLoadingPrices(true);
    const { data } = await supabase.from("ig_trade_in_prices").select("*").order("model").order("condition");
    setTradeInPrices((data as TradeInPrice[]) ?? []);
    setLoadingPrices(false);
  }, []);

  // ── Load data on tab change ──
  useEffect(() => {
    if (activeTab === "inicio") fetchDashboard();
    if (activeTab === "stock") fetchProducts();
    if (activeTab === "turnos") fetchAppointments();
    if (activeTab === "tradein") fetchTradeInPrices();
  }, [activeTab, fetchDashboard, fetchProducts, fetchAppointments, fetchTradeInPrices]);

  // ── Appointment status update ──
  async function updateAppointmentStatus(id: string, newStatus: Appointment["status"]) {
    setUpdatingAppointment(id);
    await supabase.from("ig_appointments").update({ status: newStatus }).eq("id", id);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)));
    setUpdatingAppointment(null);
  }

  // ── Trade-in price lookup ──
  function getCotizarPrice(): number | null {
    if (!cotizarModel || !cotizarCondition) return null;
    const match = tradeInPrices.find((p) => p.model === cotizarModel && p.condition === cotizarCondition);
    return match?.price_usd ?? null;
  }

  // ── Unique models for trade-in ──
  const tradeInModels = Array.from(new Set(tradeInPrices.map((p) => p.model)));

  const tabTitles: Record<Tab, string> = {
    inicio: "Inicio",
    stock: "Stock",
    turnos: "Turnos",
    tradein: "Trade-in",
    mas: "Más",
  };

  const pendingAppointments = todayAppointments.filter((a) => a.status === "pendiente" || a.status === "confirmado");

  return (
    <div className="flex flex-col min-h-screen bg-white font-[Inter]">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center justify-between">
        <span className="text-lg font-black tracking-tighter text-[#34C759]">iGreen</span>
        <span className="text-base font-bold text-slate-800">{tabTitles[activeTab]}</span>
        <div className="w-8" /> {/* Spacer for close button in layout */}
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto pb-24">
        {/* ══════ TAB: INICIO ══════ */}
        {activeTab === "inicio" && (
          <div className="p-4 space-y-4">
            {/* Greeting */}
            <div>
              <h2 className="text-xl font-bold text-slate-800">Resumen del día</h2>
              <p className="text-sm text-slate-500">
                {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-green-600">sell</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Ventas hoy</p>
                <p className="text-2xl font-black">{todaySalesCount}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-blue-600">trending_up</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Ganancia hoy</p>
                <p className="text-2xl font-black">${formatCurrency(todaySalesTotal)}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-slate-600">inventory_2</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Stock disponible</p>
                <p className="text-2xl font-black">{stockCount}</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-2">
                  <span className="material-symbols-outlined text-amber-600">calendar_today</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Turnos pendientes</p>
                <p className="text-2xl font-black">{pendingAppointments.length}</p>
              </div>
            </div>

            {/* Alerts */}
            {lowBatteryCount > 0 && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-amber-600">warning</span>
                <p className="text-sm font-medium text-amber-800">
                  {lowBatteryCount} equipo{lowBatteryCount > 1 ? "s" : ""} con batería &lt;80%
                </p>
              </div>
            )}

            {/* Today's appointments preview */}
            {pendingAppointments.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Próximos turnos</h3>
                <div className="space-y-2">
                  {pendingAppointments.slice(0, 3).map((apt) => (
                    <div key={apt.id} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm flex items-center gap-3">
                      <div className="flex-shrink-0 text-center min-w-[44px]">
                        <p className="text-lg font-black text-slate-800">{formatTime(apt.scheduled_at).split(":")[0]}</p>
                        <p className="text-xs font-bold text-slate-400">:{formatTime(apt.scheduled_at).split(":")[1]}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{apt.client_name}</p>
                        <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full ${appointmentStatusColor(apt.status)}`}>
                          {appointmentStatusLabel(apt.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                {pendingAppointments.length > 3 && (
                  <button
                    onClick={() => setActiveTab("turnos")}
                    className="w-full mt-2 py-2 text-sm font-bold text-[#34C759] text-center"
                  >
                    Ver todos los turnos →
                  </button>
                )}
              </div>
            )}

            {/* Quick actions */}
            <div>
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Acciones rápidas</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab("stock")}
                  className="bg-[#34C759] text-white rounded-xl p-4 text-left shadow-sm"
                >
                  <span className="material-symbols-outlined text-2xl mb-2">inventory_2</span>
                  <p className="text-sm font-bold">Ver Stock</p>
                </button>
                <button
                  onClick={() => setActiveTab("tradein")}
                  className="bg-slate-800 text-white rounded-xl p-4 text-left shadow-sm"
                >
                  <span className="material-symbols-outlined text-2xl mb-2">calculate</span>
                  <p className="text-sm font-bold">Cotizar Trade-in</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ TAB: STOCK ══════ */}
        {activeTab === "stock" && (
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por modelo, IMEI..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-base focus:outline-none focus:ring-2 focus:ring-[#34C759]/30"
              />
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
              {(["todos", "disponible", "reservado", "vendido"] as const).map((f) => {
                const labels = { todos: "Todos", disponible: "Disponibles", reservado: "Reservados", vendido: "Vendidos" };
                return (
                  <button
                    key={f}
                    onClick={() => setStatusFilter(f)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                      statusFilter === f
                        ? "bg-[#34C759] text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    {labels[f]}
                  </button>
                );
              })}
            </div>

            {/* Products list */}
            {loadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-[#34C759] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-4xl text-slate-300">inventory_2</span>
                <p className="text-sm text-slate-400 mt-2">No se encontraron equipos</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((eq) => (
                  <div key={eq.id} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                    <button
                      onClick={() => setExpandedCard(expandedCard === eq.id ? null : eq.id)}
                      className="w-full p-4 flex items-center gap-3 text-left"
                    >
                      <div className={`w-12 h-12 rounded-xl ${deviceCircleColor(eq.condition)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-black text-lg">{deviceInitial(eq.model)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold truncate">{eq.model}</p>
                        <p className="text-sm text-slate-500">{eq.color} · {eq.capacity}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[100px]">
                            <div className={`h-full rounded-full ${batteryBarColor(eq.battery_health)}`} style={{ width: `${eq.battery_health}%` }} />
                          </div>
                          <span className="text-xs font-bold text-slate-500">{eq.battery_health}%</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${conditionColor(eq.condition)}`}>
                            {eq.condition}
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-black">${eq.sale_price ?? 0}</p>
                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full mt-1 ${statusColor(eq.status)}`}>
                          {statusLabel(eq.status)}
                        </span>
                      </div>
                    </button>

                    {expandedCard === eq.id && (
                      <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-500">IMEI</span>
                          <span className="text-sm font-mono font-bold">{eq.imei}</span>
                        </div>
                        <div className="bg-white rounded-xl p-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Precio costo</span>
                            <span className="text-sm font-bold">${eq.cost_price ?? 0} USD</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-slate-500">Precio venta</span>
                            <span className="text-sm font-bold">${eq.sale_price ?? 0} USD</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-slate-100">
                            <span className="text-sm font-bold text-slate-500">Ganancia</span>
                            <span className="text-base font-black text-green-600">
                              ${(eq.sale_price ?? 0) - (eq.cost_price ?? 0)} USD
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${eq.origin === "propio" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"}`}>
                            {eq.origin === "propio" ? "Propio" : "Consignación"}
                          </span>
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${conditionColor(eq.condition)}`}>
                            {eq.condition} — {conditionLabel(eq.condition)}
                          </span>
                          {eq.is_new && (
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">Nuevo</span>
                          )}
                        </div>
                        {eq.consignment_owner && (
                          <p className="text-xs text-purple-600 font-medium">Consignación: {eq.consignment_owner}</p>
                        )}
                        {eq.defects && (
                          <p className="text-xs text-slate-500 italic">Defectos: {eq.defects}</p>
                        )}
                        {eq.notes && (
                          <p className="text-xs text-slate-500 italic">{eq.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════ TAB: TURNOS ══════ */}
        {activeTab === "turnos" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Turnos de Hoy</h2>
                <p className="text-sm text-slate-500">
                  {new Date().toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              </div>
              <span className="text-sm font-bold text-[#34C759] bg-green-50 px-3 py-1 rounded-full">
                {appointments.length} turno{appointments.length !== 1 ? "s" : ""}
              </span>
            </div>

            {loadingAppointments ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-[#34C759] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-4xl text-slate-300">event_available</span>
                <p className="text-sm text-slate-400 mt-2">No hay turnos para hoy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div key={apt.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 text-center min-w-[44px]">
                        <p className="text-2xl font-black text-slate-800">{formatTime(apt.scheduled_at).split(":")[0]}</p>
                        <p className="text-xs font-bold text-slate-400">:{formatTime(apt.scheduled_at).split(":")[1]}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-bold">{apt.client_name}</p>
                        {apt.client_phone && (
                          <p className="text-sm text-slate-500">{apt.client_phone}</p>
                        )}
                        <span className={`inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full ${appointmentStatusColor(apt.status)}`}>
                          {appointmentStatusLabel(apt.status)}
                        </span>
                        {apt.notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">{apt.notes}</p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons based on status */}
                    {(apt.status === "pendiente" || apt.status === "confirmado") && (
                      <div className="flex gap-2 mt-3">
                        {apt.status === "pendiente" && (
                          <button
                            onClick={() => updateAppointmentStatus(apt.id, "confirmado")}
                            disabled={updatingAppointment === apt.id}
                            className="flex-1 py-2.5 bg-[#34C759] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-lg">check</span>
                            Confirmar
                          </button>
                        )}
                        {apt.status === "confirmado" && (
                          <button
                            onClick={() => updateAppointmentStatus(apt.id, "completado")}
                            disabled={updatingAppointment === apt.id}
                            className="flex-1 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined text-lg">done_all</span>
                            Completar
                          </button>
                        )}
                        <button
                          onClick={() => updateAppointmentStatus(apt.id, "no_show")}
                          disabled={updatingAppointment === apt.id}
                          className="flex-1 py-2.5 bg-white border border-red-200 text-red-500 rounded-xl text-sm font-bold flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-lg">person_off</span>
                          No Show
                        </button>
                        {apt.client_phone && (
                          <a
                            href={`https://wa.me/${apt.client_phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 py-2.5 bg-[#25D366] text-white rounded-xl flex items-center justify-center flex-shrink-0"
                          >
                            <span className="material-symbols-outlined text-lg">chat</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════ TAB: TRADE-IN ══════ */}
        {activeTab === "tradein" && (
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

            {loadingPrices ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-[#34C759] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Step 1: Select model */}
                {cotizarStep === 1 && (
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-500">Seleccioná el modelo</p>
                    <div className="space-y-2">
                      {tradeInModels.map((model) => (
                        <button
                          key={model}
                          onClick={() => { setCotizarModel(model); setCotizarStep(2); }}
                          className="w-full flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 text-left active:bg-slate-50 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-slate-500">smartphone</span>
                          </div>
                          <span className="text-base font-bold">{model}</span>
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
                          className={`w-full p-5 rounded-xl border-2 text-left transition-all ${s.color}`}
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

                    <div className="bg-white rounded-xl border-2 border-[#34C759] p-6 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                        <span className="material-symbols-outlined text-3xl text-[#34C759]">smartphone</span>
                      </div>
                      <p className="text-base text-slate-500">{cotizarModel} · Estado {cotizarCondition}</p>
                      {getCotizarPrice() !== null ? (
                        <p className="text-4xl font-black text-[#34C759] mt-2">${getCotizarPrice()} USD</p>
                      ) : (
                        <p className="text-lg font-bold text-slate-400 mt-2">Sin precio disponible</p>
                      )}
                    </div>

                    <button
                      onClick={() => { setCotizarStep(1); setCotizarModel(""); setCotizarCondition(""); }}
                      className="w-full py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600"
                    >
                      Nueva cotización
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Full pricing table */}
            {tradeInModels.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Tabla de precios</h3>
                <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
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
                        {tradeInModels.map((model) => {
                          const priceA = tradeInPrices.find((p) => p.model === model && p.condition === "A")?.price_usd;
                          const priceB = tradeInPrices.find((p) => p.model === model && p.condition === "B")?.price_usd;
                          const priceC = tradeInPrices.find((p) => p.model === model && p.condition === "C")?.price_usd;
                          return (
                            <tr key={model}>
                              <td className="px-4 py-3 font-bold text-sm">{model}</td>
                              <td className="px-3 py-3 text-center font-bold text-green-700">{priceA != null ? `$${priceA}` : "—"}</td>
                              <td className="px-3 py-3 text-center font-bold text-amber-700">{priceB != null ? `$${priceB}` : "—"}</td>
                              <td className="px-3 py-3 text-center font-bold text-red-600">{priceC != null ? `$${priceC}` : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════ TAB: MÁS ══════ */}
        {activeTab === "mas" && (
          <div className="p-4 space-y-3">
            <h2 className="text-xl font-bold mb-4">Más opciones</h2>

            {[
              { href: "/ventas/clientes", icon: "people", label: "Clientes", desc: "Gestionar base de clientes" },
              { href: "/ventas/rendicion", icon: "receipt", label: "Rendición", desc: "Rendición de cuentas y consignación" },
              { href: "/ventas/metricas", icon: "bar_chart", label: "Métricas", desc: "Estadísticas y reportes" },
              { href: "/ventas/publicidad", icon: "campaign", label: "Publicidad", desc: "Publicaciones y marketplace" },
              { href: "/ventas/inbox", icon: "chat", label: "Inbox", desc: "Mensajes de Instagram" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm active:bg-slate-50 transition-colors"
              >
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-slate-600">{item.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold">{item.label}</p>
                  <p className="text-sm text-slate-500">{item.desc}</p>
                </div>
                <span className="material-symbols-outlined text-slate-300">chevron_right</span>
              </a>
            ))}

            {/* Version info */}
            <div className="pt-6 text-center">
              <p className="text-xs text-slate-400">iGreen PWA v2.0</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-slate-100 flex items-center justify-around px-2" style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)", height: "calc(64px + env(safe-area-inset-bottom, 8px))" }}>
        {tabConfig.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] py-1 transition-all"
            >
              <span className={`material-symbols-outlined text-2xl transition-colors ${
                isActive ? "text-[#34C759]" : "text-slate-400"
              }`}>
                {tab.icon}
              </span>
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
