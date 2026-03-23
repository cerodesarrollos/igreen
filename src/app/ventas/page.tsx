"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ───── types ───── */
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
  created_at: string;
}

interface Sale {
  id: string;
  product_id: string;
  sale_price: number;
  cost_price: number;
  payment_method: string;
  sold_at: string;
  created_at: string;
}

interface TradeInPrice {
  id: string;
  model: string;
  condition: string;
  min_battery: number;
  price_usd: number;
}

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  product_id: string | null;
}

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

function saleStatusBadge(s: string) {
  const map: Record<string, string> = {
    disponible: "bg-green-100 text-green-700",
    reservado: "bg-amber-100 text-amber-700",
    vendido: "bg-slate-200 text-slate-600",
  };
  const labels: Record<string, string> = { disponible: "Disponible", reservado: "Reservado", vendido: "Vendido" };
  return (
    <span className={`px-2.5 py-0.5 ${map[s] || "bg-slate-100 text-slate-600"} text-[10px] font-bold rounded-full`}>
      {labels[s] || s}
    </span>
  );
}

function appointmentStatusBadge(s: string) {
  const map: Record<string, string> = {
    confirmado: "bg-green-100 text-green-700",
    pendiente: "bg-amber-100 text-amber-700",
    completado: "bg-blue-100 text-blue-700",
    no_show: "bg-red-100 text-red-700",
    cancelado: "bg-slate-200 text-slate-600",
  };
  const labels: Record<string, string> = {
    confirmado: "CONFIRMADO",
    pendiente: "PENDIENTE",
    completado: "COMPLETADO",
    no_show: "NO SHOW",
    cancelado: "CANCELADO",
  };
  return (
    <span className={`px-2 py-0.5 ${map[s] || "bg-slate-100 text-slate-600"} text-[9px] font-bold rounded-full whitespace-nowrap`}>
      {labels[s] || s.toUpperCase()}
    </span>
  );
}

function formatPrice(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")} USD`;
}

/* ───── component ───── */
export default function VentasPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [tradeInPrices, setTradeInPrices] = useState<TradeInPrice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("Disponibles");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sale modal
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [saleForm, setSaleForm] = useState({
    payment_method: "efectivo",
    sale_price: "",
    notes: "",
  });
  const [savingSale, setSavingSale] = useState(false);

  // Add product modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    model: "", imei: "", capacity: "", color: "",
    condition: "A" as "A" | "B" | "C",
    battery_health: 100,
    cost_price: "", sale_price: "",
    origin: "propio" as "propio" | "consignacion",
    consignment_owner: "", defects: "", notes: "",
  });
  const [savingAdd, setSavingAdd] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [prodRes, salesRes, tradeRes, aptRes] = await Promise.all([
      supabase.from("ig_products").select("*").order("created_at", { ascending: false }),
      supabase.from("ig_sales").select("*").order("sold_at", { ascending: false }),
      supabase.from("ig_trade_in_prices").select("*").order("model"),
      supabase.from("ig_appointments").select("*").order("scheduled_at", { ascending: true }),
    ]);
    if (prodRes.data) {
      setAllProducts(prodRes.data as Product[]);
    }
    if (salesRes.data) setSales(salesRes.data as Sale[]);
    if (tradeRes.data) setTradeInPrices(tradeRes.data as TradeInPrice[]);
    if (aptRes.data) setAppointments(aptRes.data as Appointment[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* KPI calculations */
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStr = now.toISOString().slice(0, 10);

  const monthlySales = sales.filter((s) => new Date(s.sold_at || s.created_at) >= monthStart);
  const totalGanancia = monthlySales.reduce((sum, s) => sum + ((s.sale_price || 0) - (s.cost_price || 0)), 0);
  const disponibles = allProducts.filter((p) => p.status === "disponible").length;
  const turnosHoy = appointments.filter((a) => a.scheduled_at && a.scheduled_at.startsWith(todayStr)).length;

  /* Filtered equipment for table */
  const statusFilterMap: Record<string, string | null> = {
    Todos: null,
    Disponibles: "disponible",
    Reservados: "reservado",
    Vendidos: "vendido",
  };

  const filteredEquipment = allProducts.filter((p) => {
    const sf = statusFilterMap[statusFilter];
    if (sf && p.status !== sf) return false;
    if (ownershipFilter !== "all" && p.origin !== (ownershipFilter === "Propio" ? "propio" : "consignacion")) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.model.toLowerCase().includes(q) && !p.imei.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  /* Trade-in prices grouped by model */
  const tradeInModels = Array.from(new Set(tradeInPrices.map((t) => t.model)));
  const tradeInTable = tradeInModels.map((model) => {
    const rows = tradeInPrices.filter((t) => t.model === model);
    const a = rows.find((r) => r.condition === "A");
    const b = rows.find((r) => r.condition === "B");
    const c = rows.find((r) => r.condition === "C");
    const bat = rows[0]?.min_battery || 0;
    return { model, a: a?.price_usd || 0, b: b?.price_usd || 0, c: c?.price_usd || 0, bat };
  });

  /* Today appointments */
  const todayAppointments = appointments.filter((a) => a.scheduled_at && a.scheduled_at.startsWith(todayStr));

  /* Register Sale */
  function openSaleModal(product: Product) {
    setSaleProduct(product);
    setSaleForm({
      payment_method: "efectivo",
      sale_price: product.sale_price?.toString() || "",
      notes: "",
    });
    setShowSaleModal(true);
  }

  async function handleRegisterSale(e: React.FormEvent) {
    e.preventDefault();
    if (!saleProduct) return;
    setSavingSale(true);

    const payload = {
      product_id: saleProduct.id,
      sale_price: parseFloat(saleForm.sale_price) || saleProduct.sale_price || 0,
      cost_price: saleProduct.cost_price || 0,
      payment_method: saleForm.payment_method,
      notes: saleForm.notes || null,
      sold_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("ig_sales").insert(payload);
    if (!error) {
      // Update product status to vendido
      await supabase.from("ig_products").update({ status: "vendido", sold_at: new Date().toISOString() }).eq("id", saleProduct.id);
      setShowSaleModal(false);
      setSaleProduct(null);
      await fetchData();
    } else {
      alert("Error al registrar venta: " + error.message);
    }
    setSavingSale(false);
  }

  /* Add Product */
  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setSavingAdd(true);
    const payload = {
      model: addForm.model,
      imei: addForm.imei,
      capacity: addForm.capacity,
      color: addForm.color,
      condition: addForm.condition,
      battery_health: addForm.battery_health,
      cost_price: addForm.cost_price ? parseFloat(addForm.cost_price) : null,
      sale_price: addForm.sale_price ? parseFloat(addForm.sale_price) : null,
      origin: addForm.origin,
      consignment_owner: addForm.origin === "consignacion" ? addForm.consignment_owner : null,
      defects: addForm.defects || null,
      notes: addForm.notes || null,
      status: "disponible",
      loaded_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("ig_products").insert(payload);
    if (!error) {
      setShowAddModal(false);
      setAddForm({
        model: "", imei: "", capacity: "", color: "",
        condition: "A", battery_health: 100,
        cost_price: "", sale_price: "",
        origin: "propio", consignment_owner: "", defects: "", notes: "",
      });
      await fetchData();
    } else {
      alert("Error al guardar: " + error.message);
    }
    setSavingAdd(false);
  }

  const statusFilters = ["Todos", "Disponibles", "Reservados", "Vendidos"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-sm text-cool-grey">Cargando datos de ventas...</span>
      </div>
    );
  }

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
          <button
            onClick={() => {
              setAddForm({
                model: "", imei: "", capacity: "", color: "",
                condition: "A", battery_health: 100,
                cost_price: "", sale_price: "",
                origin: "propio", consignment_owner: "", defects: "", notes: "",
              });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined text-lg">add</span> Cargar Equipo
          </button>
          <button
            onClick={() => {
              const disponible = allProducts.find((p) => p.status === "disponible");
              if (disponible) openSaleModal(disponible);
              else alert("No hay equipos disponibles para vender");
            }}
            className="flex items-center gap-2 px-6 py-3 border-2 border-primary text-primary rounded-full font-bold text-sm hover:bg-primary/5 transition-all"
          >
            <span className="material-symbols-outlined text-lg">point_of_sale</span> Nueva Venta
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Equipos Disponibles", value: disponibles.toString(), icon: "phone_iphone", iconBg: "bg-green-50", iconColor: "text-green-600" },
          { label: "Turnos Hoy", value: turnosHoy.toString(), icon: "event", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
          { label: "Vendidos este mes", value: monthlySales.length.toString(), icon: "sell", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
          { label: "Ganancia del mes", value: formatPrice(totalGanancia), icon: "trending_up", iconBg: "bg-green-50", iconColor: "text-green-600" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 ${kpi.iconBg} rounded-lg`}>
                <span className={`material-symbols-outlined ${kpi.iconColor}`}>{kpi.icon}</span>
              </div>
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

              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-cool-grey">search</span>
                  <input
                    className="w-full pl-12 pr-6 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                    placeholder="Buscar por IMEI, modelo..."
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-full">
                  {[
                    { key: "all", label: "Todos" },
                    { key: "Propio", label: "Stock Propio" },
                    { key: "Consignación", label: "Consignación" },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setOwnershipFilter(item.key)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all ${ownershipFilter === item.key ? "bg-white shadow-sm" : "text-on-surface-variant"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            {filteredEquipment.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-cool-grey">
                <span className="material-symbols-outlined text-4xl mb-3">inventory_2</span>
                <p className="text-sm font-medium">No hay equipos para mostrar</p>
                <p className="text-xs mt-1">Probá cambiar los filtros o cargá un equipo nuevo</p>
              </div>
            ) : (
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
                    {filteredEquipment.map((eq) => (
                      <tr key={eq.id} onClick={() => setSelectedProduct(eq)} className={`hover:bg-slate-50 transition-colors cursor-pointer group ${selectedProduct?.id === eq.id ? "bg-primary/5" : ""}`}>
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
                        <td className="px-4 py-4 text-sm font-medium">{eq.capacity}</td>
                        <td className="px-4 py-4">{conditionBadge(eq.condition)}</td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-bold ${batteryColor(eq.battery_health)}`}>{eq.battery_health}%</span>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold">{formatPrice(eq.sale_price)}</td>
                        <td className="px-4 py-4">{saleStatusBadge(eq.status)}</td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); if (eq.status === "disponible") openSaleModal(eq); }}
                            className={`material-symbols-outlined transition-colors ${eq.status === "disponible" ? "text-primary hover:text-primary-dark" : "text-slate-300"}`}
                            title={eq.status === "disponible" ? "Registrar venta" : ""}
                          >
                            {eq.status === "disponible" ? "sell" : "chevron_right"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="p-4 bg-slate-50 flex justify-between items-center text-xs font-medium text-cool-grey border-t border-slate-100">
              <span>Mostrando {filteredEquipment.length} de {allProducts.length} equipos</span>
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
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">{turnosHoy} turno{turnosHoy !== 1 ? "s" : ""}</span>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-cool-grey">
                <span className="material-symbols-outlined text-3xl mb-2">event_available</span>
                <p className="text-xs font-medium">No hay turnos para hoy</p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((apt) => {
                  const time = new Date(apt.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div key={apt.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="text-center flex-shrink-0">
                        <p className="text-sm font-black">{time}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{apt.client_name}</p>
                        <p className="text-[10px] text-on-surface-variant">{apt.client_phone}</p>
                      </div>
                      {appointmentStatusBadge(apt.status)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 2: Detalle de Equipo */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 sticky top-24">
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-cool-grey mb-4">Detalle de Equipo</h3>

            {selectedProduct ? (
              <>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-cool-grey">smartphone</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">{selectedProduct.model}</p>
                    <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">{selectedProduct.imei}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: "Capacidad", value: selectedProduct.capacity || "—" },
                    { label: "Color", value: selectedProduct.color || "—" },
                    { label: "Estado", value: `${selectedProduct.condition} — ${({A:"Impecable",B:"Detalles",C:"Uso visible"} as Record<string,string>)[selectedProduct.condition]}` },
                    { label: "Batería", value: `${selectedProduct.battery_health}%` },
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] text-cool-grey uppercase font-bold mb-0.5">{item.label}</p>
                      <p className="text-sm font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mb-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Precios</h4>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Costo</span>
                      <span className="text-xs font-bold">{formatPrice(selectedProduct.cost_price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Venta</span>
                      <span className="text-xs font-bold">{formatPrice(selectedProduct.sale_price)}</span>
                    </div>
                    {selectedProduct.cost_price && selectedProduct.sale_price && (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                        <span className="text-xs font-bold text-on-surface-variant">Ganancia</span>
                        <span className="text-sm font-black text-green-600">{formatPrice(selectedProduct.sale_price - selectedProduct.cost_price)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Propiedad</h4>
                  <span className={`px-3 py-1 ${selectedProduct.origin === "propio" ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"} text-[10px] font-black uppercase tracking-widest rounded-full`}>
                    {selectedProduct.origin === "propio" ? "Stock Propio" : "Consignación"}
                  </span>
                  {selectedProduct.consignment_owner && (
                    <p className="text-xs text-on-surface-variant mt-2">Dueño: {selectedProduct.consignment_owner}</p>
                  )}
                </div>

                {selectedProduct.defects && (
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Defectos</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{selectedProduct.defects}</p>
                  </div>
                )}

                <div className="mb-5 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-blue-600 text-lg">verified_user</span>
                  <p className="text-xs font-medium text-blue-800">Garantía: 90 días desde la venta</p>
                </div>

                <div className="flex gap-3 pt-2">
                  {selectedProduct.status === "disponible" && (
                    <button
                      onClick={() => openSaleModal(selectedProduct)}
                      className="flex-1 py-3 bg-primary text-white rounded-full text-xs font-bold shadow-md shadow-primary/20 hover:brightness-95 transition-all flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">sell</span> Registrar Venta
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-cool-grey">
                <span className="material-symbols-outlined text-3xl mb-2">touch_app</span>
                <p className="text-xs font-medium">Seleccioná un equipo del catálogo</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Trade-in Pricing ── */}
      <section className="mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
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
          </div>

          {tradeInTable.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-cool-grey">
              <span className="material-symbols-outlined text-4xl mb-3">swap_horiz</span>
              <p className="text-sm font-medium">No hay precios de trade-in cargados</p>
            </div>
          ) : (
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
                  {tradeInTable.map((row, i) => (
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
          )}

          <div className="mt-5 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-blue-600 text-lg mt-0.5">smart_toy</span>
            <p className="text-xs text-blue-800 leading-relaxed">
              El agente IA usa esta tabla para cotizar equipos automáticamente. Cuando un cliente envía fotos, GPT Vision analiza el estado y cotiza según estos valores de referencia.
            </p>
          </div>
        </div>
      </section>

      {/* ── Consignación Summary ── */}
      <section className="mt-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_balance</span>
              <h3 className="text-lg font-bold">Rendición — Stock en Consignación</h3>
            </div>
          </div>

          {(() => {
            const consignados = allProducts.filter((p) => p.origin === "consignacion");
            const owners = Array.from(new Set(consignados.map((p) => p.consignment_owner).filter(Boolean)));
            if (owners.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 text-cool-grey">
                  <span className="material-symbols-outlined text-3xl mb-2">account_balance</span>
                  <p className="text-xs font-medium">No hay equipos en consignación</p>
                </div>
              );
            }
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Proveedor</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">En Stock</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Vendidos</th>
                      <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Costo Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {owners.map((owner) => {
                      const owned = consignados.filter((p) => p.consignment_owner === owner);
                      const enStock = owned.filter((p) => p.status === "disponible" || p.status === "reservado").length;
                      const vendidos = owned.filter((p) => p.status === "vendido").length;
                      const costoTotal = owned.reduce((s, p) => s + (p.cost_price || 0), 0);
                      return (
                        <tr key={owner} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-bold">{owner}</td>
                          <td className="px-4 py-4 text-sm font-medium">{enStock}</td>
                          <td className="px-4 py-4 text-sm font-medium">{vendidos}</td>
                          <td className="px-4 py-4 text-sm font-medium">{formatPrice(costoTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── Sale Modal ── */}
      {showSaleModal && saleProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowSaleModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Registrar Venta</h3>
              <button onClick={() => setShowSaleModal(false)} className="text-cool-grey hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleRegisterSale} className="p-6 space-y-4">
              {/* Product info */}
              <div className="bg-slate-50 p-4 rounded-xl">
                <p className="text-xs font-bold text-primary">{saleProduct.model}</p>
                <p className="text-[10px] text-on-surface-variant font-mono">{saleProduct.imei}</p>
                <p className="text-xs mt-1">{saleProduct.capacity} · {saleProduct.color} · {saleProduct.condition}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Precio de Venta (USD) *</label>
                <input type="number" step="0.01" required value={saleForm.sale_price}
                  onChange={(e) => setSaleForm({ ...saleForm, sale_price: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
              </div>

              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Método de Pago *</label>
                <select value={saleForm.payment_method} onChange={(e) => setSaleForm({ ...saleForm, payment_method: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta_debito">Tarjeta Débito</option>
                  <option value="tarjeta_credito">Tarjeta Crédito</option>
                  <option value="mixto">Mixto</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Notas</label>
                <textarea value={saleForm.notes} onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 resize-none" rows={2}
                  placeholder="Notas sobre la venta..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSaleModal(false)}
                  className="flex-1 py-3 bg-slate-200 rounded-full text-sm font-bold hover:bg-slate-300 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={savingSale}
                  className="flex-1 py-3 bg-primary text-white rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:brightness-95 transition-all disabled:opacity-50">
                  {savingSale ? "Registrando..." : "Confirmar Venta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Product Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Cargar Equipo</h3>
              <button onClick={() => setShowAddModal(false)} className="text-cool-grey hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Modelo *</label>
                <input required value={addForm.model} onChange={(e) => setAddForm({ ...addForm, model: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                  placeholder="Ej: iPhone 14 Pro Max" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">IMEI *</label>
                <input required value={addForm.imei} onChange={(e) => setAddForm({ ...addForm, imei: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 font-mono"
                  placeholder="353912110891234" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Capacidad</label>
                  <input value={addForm.capacity} onChange={(e) => setAddForm({ ...addForm, capacity: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" placeholder="128GB" />
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Color</label>
                  <input value={addForm.color} onChange={(e) => setAddForm({ ...addForm, color: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" placeholder="Negro" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Condición *</label>
                  <select value={addForm.condition} onChange={(e) => setAddForm({ ...addForm, condition: e.target.value as "A"|"B"|"C" })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                    <option value="A">A — Impecable</option>
                    <option value="B">B — Detalles menores</option>
                    <option value="C">C — Uso visible</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Batería % *</label>
                  <input type="number" min={0} max={100} required value={addForm.battery_health}
                    onChange={(e) => setAddForm({ ...addForm, battery_health: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Precio Costo (USD)</label>
                  <input type="number" step="0.01" value={addForm.cost_price}
                    onChange={(e) => setAddForm({ ...addForm, cost_price: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" placeholder="400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Precio Venta (USD)</label>
                  <input type="number" step="0.01" value={addForm.sale_price}
                    onChange={(e) => setAddForm({ ...addForm, sale_price: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" placeholder="450" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Origen *</label>
                <select value={addForm.origin} onChange={(e) => setAddForm({ ...addForm, origin: e.target.value as "propio"|"consignacion" })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                  <option value="propio">Stock Propio</option>
                  <option value="consignacion">Consignación</option>
                </select>
              </div>
              {addForm.origin === "consignacion" && (
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Dueño Consignación</label>
                  <input value={addForm.consignment_owner} onChange={(e) => setAddForm({ ...addForm, consignment_owner: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" placeholder="Nombre del dueño" />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Defectos</label>
                <textarea value={addForm.defects} onChange={(e) => setAddForm({ ...addForm, defects: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 resize-none" rows={2} />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Notas</label>
                <textarea value={addForm.notes} onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 resize-none" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-200 rounded-full text-sm font-bold hover:bg-slate-300 transition-colors">Cancelar</button>
                <button type="submit" disabled={savingAdd}
                  className="flex-1 py-3 bg-primary text-white rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:brightness-95 transition-all disabled:opacity-50">
                  {savingAdd ? "Guardando..." : "Guardar Equipo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
