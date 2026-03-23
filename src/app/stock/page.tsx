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
  photos: string[] | null;
  defects: string | null;
  notes: string | null;
  loaded_at: string | null;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
}

/* ───── iPhone Catalog ───── */
const IPHONE_CATALOG: Record<string, { capacities: string[]; colors: string[] }> = {
  "iPhone 11": { capacities: ["64GB", "128GB", "256GB"], colors: ["Negro", "Blanco", "Rojo", "Amarillo", "Verde", "Violeta"] },
  "iPhone 11 Pro": { capacities: ["64GB", "256GB", "512GB"], colors: ["Gris Espacial", "Plata", "Oro", "Verde Noche"] },
  "iPhone 11 Pro Max": { capacities: ["64GB", "256GB", "512GB"], colors: ["Gris Espacial", "Plata", "Oro", "Verde Noche"] },
  "iPhone 12 mini": { capacities: ["64GB", "128GB", "256GB"], colors: ["Negro", "Blanco", "Rojo", "Azul", "Verde"] },
  "iPhone 12": { capacities: ["64GB", "128GB", "256GB"], colors: ["Negro", "Blanco", "Rojo", "Azul", "Verde"] },
  "iPhone 12 Pro": { capacities: ["128GB", "256GB", "512GB"], colors: ["Grafito", "Plata", "Oro", "Azul Pacífico"] },
  "iPhone 12 Pro Max": { capacities: ["128GB", "256GB", "512GB"], colors: ["Grafito", "Plata", "Oro", "Azul Pacífico"] },
  "iPhone 13 mini": { capacities: ["128GB", "256GB", "512GB"], colors: ["Negro Noche", "Luz de Estrella", "Rojo", "Azul", "Rosa", "Verde"] },
  "iPhone 13": { capacities: ["128GB", "256GB", "512GB"], colors: ["Negro Noche", "Luz de Estrella", "Rojo", "Azul", "Rosa", "Verde"] },
  "iPhone 13 Pro": { capacities: ["128GB", "256GB", "512GB", "1TB"], colors: ["Grafito", "Plata", "Oro", "Azul Sierra", "Verde Alpino"] },
  "iPhone 13 Pro Max": { capacities: ["128GB", "256GB", "512GB", "1TB"], colors: ["Grafito", "Plata", "Oro", "Azul Sierra", "Verde Alpino"] },
  "iPhone 14": { capacities: ["128GB", "256GB", "512GB"], colors: ["Negro Noche", "Luz de Estrella", "Rojo", "Azul", "Violeta", "Amarillo"] },
  "iPhone 14 Plus": { capacities: ["128GB", "256GB", "512GB"], colors: ["Negro Noche", "Luz de Estrella", "Rojo", "Azul", "Violeta", "Amarillo"] },
  "iPhone 14 Pro": { capacities: ["128GB", "256GB", "512GB", "1TB"], colors: ["Negro Espacial", "Plata", "Oro", "Violeta Oscuro"] },
  "iPhone 14 Pro Max": { capacities: ["128GB", "256GB", "512GB", "1TB"], colors: ["Negro Espacial", "Plata", "Oro", "Violeta Oscuro"] },
  "iPhone 15": { capacities: ["128GB", "256GB", "512GB"], colors: ["Negro", "Azul", "Verde", "Amarillo", "Rosa"] },
  "iPhone 15 Plus": { capacities: ["128GB", "256GB", "512GB"], colors: ["Negro", "Azul", "Verde", "Amarillo", "Rosa"] },
  "iPhone 15 Pro": { capacities: ["128GB", "256GB", "512GB", "1TB"], colors: ["Titanio Negro", "Titanio Blanco", "Titanio Natural", "Titanio Azul"] },
  "iPhone 15 Pro Max": { capacities: ["256GB", "512GB", "1TB"], colors: ["Titanio Negro", "Titanio Blanco", "Titanio Natural", "Titanio Azul"] },
  "iPhone 16": { capacities: ["128GB", "256GB", "512GB"], colors: ["Negro", "Blanco", "Azul", "Verde", "Rosa"] },
  "iPhone 16 Plus": { capacities: ["128GB", "256GB", "512GB"], colors: ["Negro", "Blanco", "Azul", "Verde", "Rosa"] },
  "iPhone 16 Pro": { capacities: ["128GB", "256GB", "512GB", "1TB"], colors: ["Titanio Negro", "Titanio Blanco", "Titanio Natural", "Titanio Desierto"] },
  "iPhone 16 Pro Max": { capacities: ["256GB", "512GB", "1TB"], colors: ["Titanio Negro", "Titanio Blanco", "Titanio Natural", "Titanio Desierto"] },
  "iPhone SE (2da)": { capacities: ["64GB", "128GB", "256GB"], colors: ["Negro", "Blanco", "Rojo"] },
  "iPhone SE (3ra)": { capacities: ["64GB", "128GB", "256GB"], colors: ["Negro Noche", "Luz de Estrella", "Rojo"] },
};

const MODEL_NAMES = Object.keys(IPHONE_CATALOG);

const emptyForm = {
  model: "",
  imei: "",
  capacity: "",
  color: "",
  condition: "A" as "A" | "B" | "C",
  battery_health: 100,
  cost_price: "",
  sale_price: "",
  origin: "propio" as "propio" | "consignacion",
  consignment_owner: "",
  defects: "",
  notes: "",
};

/* ───── helpers ───── */
function maskImei(imei: string) {
  return "•••••" + imei.slice(-4);
}

function conditionLabel(c: "A" | "B" | "C") {
  const map = { A: "Impecable", B: "Detalles menores", C: "Uso visible" };
  return map[c];
}

function conditionBadge(c: "A" | "B" | "C") {
  const map = {
    A: "bg-green-100 text-green-700",
    B: "bg-amber-100 text-amber-700",
    C: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 ${map[c]} text-[10px] font-bold rounded-full whitespace-nowrap`}>
      {c} — {conditionLabel(c)}
    </span>
  );
}

function batteryColor(pct: number) {
  if (pct > 85) return "text-green-600";
  if (pct >= 70) return "text-amber-600";
  return "text-red-500";
}

function statusBadge(s: Product["status"]) {
  const map = {
    disponible: { label: "Disponible", cls: "bg-green-100 text-green-700" },
    reservado: { label: "Reservado", cls: "bg-amber-100 text-amber-700" },
    vendido: { label: "Vendido", cls: "bg-slate-200 text-slate-600" },
  };
  const m = map[s];
  return <span className={`px-2.5 py-0.5 ${m.cls} text-[10px] font-bold rounded-full`}>{m.label}</span>;
}

function originBadge(o: Product["origin"]) {
  return o === "propio"
    ? <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">Stock Propio</span>
    : <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest rounded-full">Consignación</span>;
}

function formatPrice(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")} USD`;
}

/* ───── component ───── */
export default function StockPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [conditionFilter, setConditionFilter] = useState<string>("todos");
  const [originFilter, setOriginFilter] = useState<string>("todos");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ig_products")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setProducts(data as Product[]);
      // If a product was selected, refresh it
      if (selectedProduct) {
        const updated = data.find((p: Product) => p.id === selectedProduct.id);
        if (updated) setSelectedProduct(updated as Product);
      }
    }
    setLoading(false);
  }, [selectedProduct]);

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Filters */
  const filtered = products.filter((p) => {
    if (statusFilter !== "todos" && p.status !== statusFilter) return false;
    if (conditionFilter !== "todos" && p.condition !== conditionFilter) return false;
    if (originFilter !== "todos" && p.origin !== originFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.model.toLowerCase().includes(q) && !p.imei.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    disponible: products.filter((p) => p.status === "disponible").length,
    reservado: products.filter((p) => p.status === "reservado").length,
    vendido: products.filter((p) => p.status === "vendido").length,
    lowBattery: products.filter((p) => p.battery_health < 80 && p.status === "disponible").length,
  };

  /* Add product */
  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      model: form.model,
      imei: form.imei,
      capacity: form.capacity,
      color: form.color,
      condition: form.condition,
      battery_health: form.battery_health,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      origin: form.origin,
      consignment_owner: form.origin === "consignacion" ? form.consignment_owner : null,
      defects: form.defects || null,
      notes: form.notes || null,
      status: "disponible",
      loaded_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("ig_products").insert(payload);
    if (!error) {
      setShowModal(false);
      setForm(emptyForm);
      await fetchProducts();
    } else {
      alert("Error al guardar: " + error.message);
    }
    setSaving(false);
  }

  /* Edit product */
  function openEditModal(product: Product) {
    setEditingProduct(product);
    setEditForm({
      model: product.model || "",
      imei: product.imei || "",
      capacity: product.capacity || "",
      color: product.color || "",
      condition: product.condition,
      battery_health: product.battery_health,
      cost_price: product.cost_price?.toString() || "",
      sale_price: product.sale_price?.toString() || "",
      origin: product.origin,
      consignment_owner: product.consignment_owner || "",
      defects: product.defects || "",
      notes: product.notes || "",
    });
    setShowEditModal(true);
  }

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    setSaving(true);
    const payload = {
      model: editForm.model,
      imei: editForm.imei,
      capacity: editForm.capacity,
      color: editForm.color,
      condition: editForm.condition,
      battery_health: editForm.battery_health,
      cost_price: editForm.cost_price ? parseFloat(editForm.cost_price) : null,
      sale_price: editForm.sale_price ? parseFloat(editForm.sale_price) : null,
      origin: editForm.origin,
      consignment_owner: editForm.origin === "consignacion" ? editForm.consignment_owner : null,
      defects: editForm.defects || null,
      notes: editForm.notes || null,
    };
    const { error } = await supabase.from("ig_products").update(payload).eq("id", editingProduct.id);
    if (!error) {
      setShowEditModal(false);
      setEditingProduct(null);
      await fetchProducts();
    } else {
      alert("Error al actualizar: " + error.message);
    }
    setSaving(false);
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock e Inventario</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gestión de productos, equipos y niveles de stock</p>
        </div>
      </div>

      {/* Alert Banner — only show if there are low battery items */}
      {counts.lowBattery > 0 && (
        <section className="mb-8 p-6 bg-red-50 border border-red-100 rounded-xl flex items-start gap-4">
          <span className="material-symbols-outlined text-red-500 mt-0.5">report</span>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-800 mb-2">Alertas de Stock</h4>
            <p className="text-xs text-red-700">{counts.lowBattery} equipo(s) disponible(s) con batería menor a 80%</p>
          </div>
        </section>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* Categories Sidebar */}
        <div className="col-span-12 lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-cool-grey mb-4 px-2">Estado</h3>
            <div className="flex flex-col gap-1">
              {[
                { key: "todos", icon: "list", label: `Todos (${products.length})` },
                { key: "disponible", icon: "check_circle", label: `Disponibles (${counts.disponible})`, color: "text-green-500" },
                { key: "reservado", icon: "schedule", label: `Reservados (${counts.reservado})`, color: "text-amber-500" },
                { key: "vendido", icon: "sell", label: `Vendidos (${counts.vendido})`, color: "text-slate-400" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setStatusFilter(item.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    statusFilter === item.key ? "bg-white text-primary shadow-sm" : "text-cool-grey hover:bg-slate-100"
                  }`}
                >
                  <span className={`material-symbols-outlined ${item.color || ""}`}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-cool-grey mb-4 px-2">Condición</h3>
            <div className="flex flex-col gap-1">
              {[
                { key: "todos", label: "Todos" },
                { key: "A", label: "A — Impecable" },
                { key: "B", label: "B — Detalles" },
                { key: "C", label: "C — Uso visible" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setConditionFilter(item.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    conditionFilter === item.key ? "bg-white text-primary shadow-sm" : "text-cool-grey hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-cool-grey mb-4 px-2">Origen</h3>
            <div className="flex flex-col gap-1">
              {[
                { key: "todos", label: "Todos" },
                { key: "propio", label: "Stock Propio" },
                { key: "consignacion", label: "Consignación" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setOriginFilter(item.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    originFilter === item.key ? "bg-white text-primary shadow-sm" : "text-cool-grey hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="col-span-12 lg:col-span-7">
          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-cool-grey">search</span>
                <input
                  className="w-full pl-12 pr-6 py-3 bg-white rounded-xl border border-slate-200 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                  placeholder="Buscar por modelo o IMEI..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setForm(emptyForm); setShowModal(true); }}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm shadow-md shadow-primary/20"
              >
                <span className="material-symbols-outlined text-lg">add</span> Agregar Producto
              </button>
              <button
                onClick={() => { setForm(emptyForm); setShowModal(true); }}
                className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary-dark rounded-full font-bold text-sm"
              >
                <span className="material-symbols-outlined text-lg">inventory</span> Entrada Stock
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-sm text-cool-grey">Cargando productos...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-cool-grey">
                <span className="material-symbols-outlined text-4xl mb-3">inventory_2</span>
                <p className="text-sm font-medium">No hay productos cargados</p>
                <p className="text-xs mt-1">Agregá tu primer producto con el botón de arriba</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Equipo</th>
                        <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">IMEI</th>
                        <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Capacidad</th>
                        <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Condición</th>
                        <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Batería</th>
                        <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Precio</th>
                        <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Estado</th>
                        <th className="px-4 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedProduct(p)}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer group ${selectedProduct?.id === p.id ? "bg-primary/5" : ""}`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-lg text-cool-grey">smartphone</span>
                              </div>
                              <div>
                                <p className="text-sm font-bold">{p.model}</p>
                                <p className="text-[10px] text-on-surface-variant">{p.color}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 font-mono text-xs text-cool-grey">{maskImei(p.imei)}</td>
                          <td className="px-4 py-4 text-sm font-medium">{p.capacity}</td>
                          <td className="px-4 py-4">{conditionBadge(p.condition)}</td>
                          <td className="px-4 py-4">
                            <span className={`text-sm font-bold ${batteryColor(p.battery_health)}`}>{p.battery_health}%</span>
                          </td>
                          <td className="px-4 py-4 text-sm font-bold">{formatPrice(p.sale_price)}</td>
                          <td className="px-4 py-4">{statusBadge(p.status)}</td>
                          <td className="px-4 py-4 text-right">
                            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-50 flex justify-between items-center text-xs font-medium text-cool-grey border-t border-slate-100">
                  <span>Mostrando {filtered.length} de {products.length} productos</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 sticky top-24">
            {selectedProduct ? (
              <>
                <h2 className="text-xl font-black mb-6">Detalle del Producto</h2>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-cool-grey">smartphone</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">{selectedProduct.model}</p>
                    <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">{selectedProduct.imei}</p>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: "Capacidad", value: selectedProduct.capacity },
                    { label: "Color", value: selectedProduct.color },
                    { label: "Estado Equipo", value: `${selectedProduct.condition} — ${conditionLabel(selectedProduct.condition)}` },
                    { label: "Batería", value: `${selectedProduct.battery_health}%` },
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
                      <span className="text-xs font-bold">{formatPrice(selectedProduct.cost_price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Venta</span>
                      <span className="text-xs font-bold">{formatPrice(selectedProduct.sale_price)}</span>
                    </div>
                    {selectedProduct.cost_price && selectedProduct.sale_price && (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                        <span className="text-xs font-bold text-on-surface-variant">Ganancia</span>
                        <span className="text-sm font-black text-green-600">
                          {formatPrice(selectedProduct.sale_price - selectedProduct.cost_price)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Propiedad */}
                <div className="mb-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Propiedad</h4>
                  {originBadge(selectedProduct.origin)}
                  {selectedProduct.consignment_owner && (
                    <p className="text-xs text-on-surface-variant mt-2">Dueño: {selectedProduct.consignment_owner}</p>
                  )}
                </div>

                {/* Estado */}
                <div className="mb-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Estado de Venta</h4>
                  {statusBadge(selectedProduct.status)}
                </div>

                {/* Defectos */}
                {selectedProduct.defects && (
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Defectos</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{selectedProduct.defects}</p>
                  </div>
                )}

                {/* Notas */}
                {selectedProduct.notes && (
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Notas</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{selectedProduct.notes}</p>
                  </div>
                )}

                {/* Fotos placeholders */}
                <div className="mb-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Fotos</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {(selectedProduct.photos && selectedProduct.photos.length > 0
                      ? selectedProduct.photos
                      : [null, null, null, null]
                    ).map((photo, n) => (
                      <div key={n} className="aspect-square rounded-lg bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-lg text-slate-300">image</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Garantía */}
                <div className="mb-5 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <span className="material-symbols-outlined text-blue-600 text-lg">verified_user</span>
                  <p className="text-xs font-medium text-blue-800">Garantía: 90 días desde la venta</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => openEditModal(selectedProduct)}
                    className="flex-1 py-3 bg-slate-200 rounded-full text-xs font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span> Editar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-cool-grey">
                <span className="material-symbols-outlined text-4xl mb-3">touch_app</span>
                <p className="text-sm font-medium">Seleccioná un producto</p>
                <p className="text-xs mt-1">Hacé click en un equipo de la tabla para ver sus detalles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Product Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Agregar Producto</h3>
              <button onClick={() => setShowModal(false)} className="text-cool-grey hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 space-y-4">
              {/* Model */}
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Modelo *</label>
                <select required value={form.model} onChange={(e) => {
                  const m = e.target.value;
                  const spec = IPHONE_CATALOG[m];
                  setForm({ ...form, model: m, capacity: spec ? spec.capacities[0] : "", color: spec ? spec.colors[0] : "" });
                }}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                  <option value="">Seleccionar modelo...</option>
                  {MODEL_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {/* IMEI */}
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">IMEI *</label>
                <input required value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 font-mono"
                  placeholder="353912110891234" />
              </div>
              {/* Capacity + Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Capacidad</label>
                  {form.model && IPHONE_CATALOG[form.model] ? (
                    <select value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                      {IPHONE_CATALOG[form.model].capacities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                      placeholder="128GB" />
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Color</label>
                  {form.model && IPHONE_CATALOG[form.model] ? (
                    <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                      {IPHONE_CATALOG[form.model].colors.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                      placeholder="Negro" />
                  )}
                </div>
              </div>
              {/* Condition + Battery */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Condición *</label>
                  <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as "A" | "B" | "C" })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                    <option value="A">A — Impecable</option>
                    <option value="B">B — Detalles menores</option>
                    <option value="C">C — Uso visible</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Batería % *</label>
                  <input type="number" min={0} max={100} required value={form.battery_health}
                    onChange={(e) => setForm({ ...form, battery_health: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>
              {/* Prices */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Precio Costo (USD)</label>
                  <input type="number" step="0.01" value={form.cost_price}
                    onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                    placeholder="400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Precio Venta (USD)</label>
                  <input type="number" step="0.01" value={form.sale_price}
                    onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                    placeholder="450" />
                </div>
              </div>
              {/* Origin */}
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Origen *</label>
                <select value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value as "propio" | "consignacion" })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                  <option value="propio">Stock Propio</option>
                  <option value="consignacion">Consignación</option>
                </select>
              </div>
              {form.origin === "consignacion" && (
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Dueño Consignación</label>
                  <input value={form.consignment_owner} onChange={(e) => setForm({ ...form, consignment_owner: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                    placeholder="Nombre del dueño" />
                </div>
              )}
              {/* Defects */}
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Defectos</label>
                <textarea value={form.defects} onChange={(e) => setForm({ ...form, defects: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 resize-none"
                  rows={2} placeholder="Describir defectos si los hay..." />
              </div>
              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 resize-none"
                  rows={2} placeholder="Notas adicionales..." />
              </div>
              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-200 rounded-full text-sm font-bold hover:bg-slate-300 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-primary text-white rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:brightness-95 transition-all disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Product Modal ── */}
      {showEditModal && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Editar Producto</h3>
              <button onClick={() => setShowEditModal(false)} className="text-cool-grey hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleEditProduct} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Modelo *</label>
                <select required value={editForm.model} onChange={(e) => {
                  const m = e.target.value;
                  const spec = IPHONE_CATALOG[m];
                  setEditForm({ ...editForm, model: m, capacity: spec ? spec.capacities[0] : editForm.capacity, color: spec ? spec.colors[0] : editForm.color });
                }}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                  <option value="">Seleccionar modelo...</option>
                  {MODEL_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">IMEI *</label>
                <input required value={editForm.imei} onChange={(e) => setEditForm({ ...editForm, imei: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Capacidad</label>
                  {editForm.model && IPHONE_CATALOG[editForm.model] ? (
                    <select value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                      {IPHONE_CATALOG[editForm.model].capacities.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Color</label>
                  {editForm.model && IPHONE_CATALOG[editForm.model] ? (
                    <select value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                      {IPHONE_CATALOG[editForm.model].colors.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Condición *</label>
                  <select value={editForm.condition} onChange={(e) => setEditForm({ ...editForm, condition: e.target.value as "A" | "B" | "C" })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                    <option value="A">A — Impecable</option>
                    <option value="B">B — Detalles menores</option>
                    <option value="C">C — Uso visible</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Batería % *</label>
                  <input type="number" min={0} max={100} required value={editForm.battery_health}
                    onChange={(e) => setEditForm({ ...editForm, battery_health: parseInt(e.target.value) || 0 })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Precio Costo (USD)</label>
                  <input type="number" step="0.01" value={editForm.cost_price}
                    onChange={(e) => setEditForm({ ...editForm, cost_price: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Precio Venta (USD)</label>
                  <input type="number" step="0.01" value={editForm.sale_price}
                    onChange={(e) => setEditForm({ ...editForm, sale_price: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Origen *</label>
                <select value={editForm.origin} onChange={(e) => setEditForm({ ...editForm, origin: e.target.value as "propio" | "consignacion" })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                  <option value="propio">Stock Propio</option>
                  <option value="consignacion">Consignación</option>
                </select>
              </div>
              {editForm.origin === "consignacion" && (
                <div>
                  <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Dueño Consignación</label>
                  <input value={editForm.consignment_owner} onChange={(e) => setEditForm({ ...editForm, consignment_owner: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Defectos</label>
                <textarea value={editForm.defects} onChange={(e) => setEditForm({ ...editForm, defects: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 resize-none" rows={2} />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Notas</label>
                <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 resize-none" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3 bg-slate-200 rounded-full text-sm font-bold hover:bg-slate-300 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-primary text-white rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:brightness-95 transition-all disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
