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
  is_new: boolean;
  loaded_at: string | null;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
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

const emptyProductForm = {
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
  is_new: false,
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

function statusBadge(s: string) {
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

function originBadge(o: string) {
  return o === "propio"
    ? <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full">Stock Propio</span>
    : <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase tracking-widest rounded-full">Consignación</span>;
}

function formatPrice(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")} USD`;
}

/* ───── Product Form Modal ───── */
function ProductFormModal({
  title,
  form,
  setForm,
  onSubmit,
  onClose,
  saving,
  submitLabel,
}: {
  title: string;
  form: typeof emptyProductForm;
  setForm: (f: typeof emptyProductForm) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-cool-grey hover:text-on-surface">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
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
          {/* New/Used toggle */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Tipo</label>
            <button type="button" onClick={() => setForm({ ...form, is_new: !form.is_new })}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${form.is_new ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
              {form.is_new ? "Nuevo" : "Usado"}
            </button>
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
            <button type="button" onClick={onClose}
              className="flex-1 py-3 bg-slate-200 rounded-full text-sm font-bold hover:bg-slate-300 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-primary text-white rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:brightness-95 transition-all disabled:opacity-50">
              {saving ? "Guardando..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ───── component ───── */
export default function VentasStockPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [conditionFilter, setConditionFilter] = useState<string>("todos");
  const [originFilter, setOriginFilter] = useState<string>("todos");
  const [newFilter, setNewFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sale modal
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [saleForm, setSaleForm] = useState({ payment_method: "efectivo", sale_price: "", notes: "" });
  const [savingSale, setSavingSale] = useState(false);

  // Add product modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyProductForm);
  const [savingAdd, setSavingAdd] = useState(false);

  // Edit product modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(emptyProductForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [prodRes, salesRes] = await Promise.all([
      supabase.from("ig_products").select("*").order("created_at", { ascending: false }),
      supabase.from("ig_sales").select("*").order("sold_at", { ascending: false }),
    ]);
    if (prodRes.data) {
      setAllProducts(prodRes.data as Product[]);
      if (selectedProduct) {
        const updated = prodRes.data.find((p: Product) => p.id === selectedProduct.id);
        if (updated) setSelectedProduct(updated as Product);
      }
    }
    if (salesRes.data) setSales(salesRes.data as Sale[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* KPI calculations */
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  const disponibles = allProducts.filter((p) => p.status === "disponible").length;
  const reservados = allProducts.filter((p) => p.status === "reservado").length;
  const vendidosHoy = sales.filter((s) => (s.sold_at || s.created_at).startsWith(todayStr)).length;
  const valorStock = allProducts
    .filter((p) => p.status === "disponible")
    .reduce((sum, p) => sum + (p.sale_price || 0), 0);

  /* Filters */
  const filtered = allProducts.filter((p) => {
    if (statusFilter !== "todos" && p.status !== statusFilter) return false;
    if (conditionFilter !== "todos" && p.condition !== conditionFilter) return false;
    if (originFilter !== "todos" && p.origin !== originFilter) return false;
    if (newFilter === "nuevo" && !p.is_new) return false;
    if (newFilter === "usado" && p.is_new) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.model.toLowerCase().includes(q) && !p.imei.toLowerCase().includes(q)) return false;
    }
    return true;
  });

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
      is_new: addForm.is_new,
      status: "disponible",
      loaded_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("ig_products").insert(payload);
    if (!error) {
      setShowAddModal(false);
      setAddForm(emptyProductForm);
      await fetchData();
    } else {
      alert("Error al guardar: " + error.message);
    }
    setSavingAdd(false);
  }

  /* Edit Product */
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
      is_new: product.is_new ?? false,
    });
    setShowEditModal(true);
  }

  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEdit(true);
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
      is_new: editForm.is_new,
    };
    const { error } = await supabase.from("ig_products").update(payload).eq("id", editingProduct.id);
    if (!error) {
      setShowEditModal(false);
      setEditingProduct(null);
      await fetchData();
    } else {
      alert("Error al actualizar: " + error.message);
    }
    setSavingEdit(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-sm text-cool-grey">Cargando stock de equipos...</span>
      </div>
    );
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock de Equipos</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gestión de inventario iPhone — alta, edición y venta</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setAddForm(emptyProductForm); setShowAddModal(true); }}
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
          { label: "Total Disponible", value: disponibles.toString(), icon: "phone_iphone", iconBg: "bg-green-50", iconColor: "text-green-600" },
          { label: "Reservados", value: reservados.toString(), icon: "schedule", iconBg: "bg-amber-50", iconColor: "text-amber-600" },
          { label: "Vendidos Hoy", value: vendidosHoy.toString(), icon: "sell", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
          { label: "Valor Stock", value: formatPrice(valorStock), icon: "trending_up", iconBg: "bg-green-50", iconColor: "text-green-600" },
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
        {/* Categories Sidebar */}
        <div className="col-span-12 lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-cool-grey mb-4 px-2">Estado</h3>
            <div className="flex flex-col gap-1">
              {[
                { key: "todos", icon: "list", label: `Todos (${allProducts.length})` },
                { key: "disponible", icon: "check_circle", label: `Disponibles (${disponibles})`, color: "text-green-500" },
                { key: "reservado", icon: "schedule", label: `Reservados (${reservados})`, color: "text-amber-500" },
                { key: "vendido", icon: "sell", label: `Vendidos (${allProducts.filter((p) => p.status === "vendido").length})`, color: "text-slate-400" },
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
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-cool-grey mb-4 px-2">Tipo</h3>
            <div className="flex flex-col gap-1">
              {[
                { key: "todos", label: "Todos" },
                { key: "nuevo", label: "Nuevos" },
                { key: "usado", label: "Usados" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setNewFilter(item.key)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    newFilter === item.key ? "bg-white text-primary shadow-sm" : "text-cool-grey hover:bg-slate-100"
                  }`}
                >
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
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-cool-grey">
                <span className="material-symbols-outlined text-4xl mb-3">inventory_2</span>
                <p className="text-sm font-medium">No hay equipos para mostrar</p>
                <p className="text-xs mt-1">Probá cambiar los filtros o cargá un equipo nuevo</p>
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
                                <div className="flex items-center gap-1.5">
                                  <p className="text-[10px] text-on-surface-variant">{p.color}</p>
                                  {p.is_new && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-bold rounded-full">NUEVO</span>}
                                </div>
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
                            <button
                              onClick={(ev) => { ev.stopPropagation(); if (p.status === "disponible") openSaleModal(p); }}
                              className={`material-symbols-outlined transition-colors ${p.status === "disponible" ? "text-primary hover:text-primary-dark" : "text-slate-300"}`}
                              title={p.status === "disponible" ? "Registrar venta" : ""}
                            >
                              {p.status === "disponible" ? "sell" : "chevron_right"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-50 flex justify-between items-center text-xs font-medium text-cool-grey border-t border-slate-100">
                  <span>Mostrando {filtered.length} de {allProducts.length} equipos</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
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
                    {selectedProduct.is_new && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded-full">NUEVO</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: "Capacidad", value: selectedProduct.capacity || "—" },
                    { label: "Color", value: selectedProduct.color || "—" },
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
                        <span className="text-sm font-black text-green-600">{formatPrice(selectedProduct.sale_price - selectedProduct.cost_price)}</span>
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

                {/* Fotos */}
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
                  {selectedProduct.status === "disponible" && (
                    <button
                      onClick={() => openSaleModal(selectedProduct)}
                      className="flex-1 py-3 bg-primary text-white rounded-full text-xs font-bold shadow-md shadow-primary/20 hover:brightness-95 transition-all flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">sell</span> Vender
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-cool-grey">
                <span className="material-symbols-outlined text-4xl mb-3">touch_app</span>
                <p className="text-sm font-medium">Seleccioná un equipo</p>
                <p className="text-xs mt-1">Hacé click en un equipo de la tabla para ver sus detalles</p>
              </div>
            )}
          </div>
        </div>
      </div>

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
        <ProductFormModal
          title="Cargar Equipo"
          form={addForm}
          setForm={setAddForm}
          onSubmit={handleAddProduct}
          onClose={() => setShowAddModal(false)}
          saving={savingAdd}
          submitLabel="Guardar Equipo"
        />
      )}

      {/* ── Edit Product Modal ── */}
      {showEditModal && editingProduct && (
        <ProductFormModal
          title="Editar Equipo"
          form={editForm}
          setForm={setEditForm}
          onSubmit={handleEditProduct}
          onClose={() => setShowEditModal(false)}
          saving={savingEdit}
          submitLabel="Guardar Cambios"
        />
      )}
    </>
  );
}
