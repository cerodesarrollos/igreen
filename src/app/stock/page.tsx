"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ───── types ───── */
interface Part {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  brand: string | null;
  compatible_models: string[];
  supplier: string | null;
  cost_price: number | null;
  sale_price: number | null;
  stock_qty: number;
  min_stock: number;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/* ───── constants ───── */
const CATEGORIES = [
  "Pantallas",
  "Baterías",
  "Fundas",
  "Cables/Cargadores",
  "Vidrios Templados",
  "Flex/Componentes",
  "Herramientas",
  "Otros",
];

const IPHONE_MODELS = [
  "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max",
  "iPhone 12 mini", "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max",
  "iPhone 13 mini", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max",
  "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
  "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
  "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
  "iPhone SE (2da)", "iPhone SE (3ra)",
];

const emptyForm = {
  name: "",
  category: "Otros",
  sku: "",
  brand: "",
  compatible_models: [] as string[],
  supplier: "",
  cost_price: "",
  sale_price: "",
  stock_qty: "1",
  min_stock: "1",
  location: "",
  notes: "",
};

/* ───── helpers ───── */
function formatPrice(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")} USD`;
}

function categoryIcon(cat: string) {
  const map: Record<string, string> = {
    Pantallas: "screen_replacement",
    Baterías: "battery_full",
    Fundas: "phone_android",
    "Cables/Cargadores": "cable",
    "Vidrios Templados": "filter_frames",
    "Flex/Componentes": "memory",
    Herramientas: "build",
    Otros: "category",
  };
  return map[cat] || "category";
}

function categoryColor(cat: string) {
  const map: Record<string, string> = {
    Pantallas: "bg-blue-100 text-blue-700",
    Baterías: "bg-green-100 text-green-700",
    Fundas: "bg-purple-100 text-purple-700",
    "Cables/Cargadores": "bg-amber-100 text-amber-700",
    "Vidrios Templados": "bg-cyan-100 text-cyan-700",
    "Flex/Componentes": "bg-red-100 text-red-700",
    Herramientas: "bg-slate-200 text-slate-700",
    Otros: "bg-slate-100 text-slate-600",
  };
  return map[cat] || "bg-slate-100 text-slate-600";
}

/* ───── component ───── */
export default function StockPage() {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("todos");
  const [supplierFilter, setSupplierFilter] = useState<string>("todos");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  const fetchParts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("ig_parts")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setParts(data as Part[]);
      if (selectedPart) {
        const updated = data.find((p: Part) => p.id === selectedPart.id);
        if (updated) setSelectedPart(updated as Part);
      }
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  /* Filters */
  const filtered = parts.filter((p) => {
    if (categoryFilter !== "todos" && p.category !== categoryFilter) return false;
    if (supplierFilter !== "todos" && p.supplier !== supplierFilter) return false;
    if (lowStockOnly && p.stock_qty > p.min_stock) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !(p.sku || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const suppliers = Array.from(new Set(parts.map((p) => p.supplier).filter(Boolean))) as string[];
  const lowStockCount = parts.filter((p) => p.stock_qty <= p.min_stock).length;
  const totalProducts = parts.length;
  const valorInventario = parts.reduce((sum, p) => sum + (p.sale_price || 0) * p.stock_qty, 0);
  const categoriesUsed = new Set(parts.map((p) => p.category)).size;

  /* Add part */
  async function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      category: form.category,
      sku: form.sku || null,
      brand: form.brand || null,
      compatible_models: form.compatible_models,
      supplier: form.supplier || null,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      stock_qty: parseInt(form.stock_qty) || 0,
      min_stock: parseInt(form.min_stock) || 1,
      location: form.location || null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("ig_parts").insert(payload);
    if (!error) {
      setShowModal(false);
      setForm(emptyForm);
      await fetchParts();
    } else {
      alert("Error al guardar: " + error.message);
    }
    setSaving(false);
  }

  /* Edit part */
  function openEditModal(part: Part) {
    setEditingPart(part);
    setEditForm({
      name: part.name || "",
      category: part.category || "Otros",
      sku: part.sku || "",
      brand: part.brand || "",
      compatible_models: part.compatible_models || [],
      supplier: part.supplier || "",
      cost_price: part.cost_price?.toString() || "",
      sale_price: part.sale_price?.toString() || "",
      stock_qty: part.stock_qty?.toString() || "0",
      min_stock: part.min_stock?.toString() || "1",
      location: part.location || "",
      notes: part.notes || "",
    });
    setShowEditModal(true);
  }

  async function handleEditPart(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPart) return;
    setSaving(true);
    const payload = {
      name: editForm.name,
      category: editForm.category,
      sku: editForm.sku || null,
      brand: editForm.brand || null,
      compatible_models: editForm.compatible_models,
      supplier: editForm.supplier || null,
      cost_price: editForm.cost_price ? parseFloat(editForm.cost_price) : null,
      sale_price: editForm.sale_price ? parseFloat(editForm.sale_price) : null,
      stock_qty: parseInt(editForm.stock_qty) || 0,
      min_stock: parseInt(editForm.min_stock) || 1,
      location: editForm.location || null,
      notes: editForm.notes || null,
    };
    const { error } = await supabase.from("ig_parts").update(payload).eq("id", editingPart.id);
    if (!error) {
      setShowEditModal(false);
      setEditingPart(null);
      await fetchParts();
    } else {
      alert("Error al actualizar: " + error.message);
    }
    setSaving(false);
  }

  /* Reusable form fields */
  function renderPartForm(
    currentForm: typeof emptyForm,
    setCurrentForm: (f: typeof emptyForm) => void,
    onSubmit: (e: React.FormEvent) => void,
    onClose: () => void,
    title: string,
    submitLabel: string,
  ) {
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
            {/* Name */}
            <div>
              <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Nombre *</label>
              <input required value={currentForm.name} onChange={(e) => setCurrentForm({ ...currentForm, name: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                placeholder="Ej: Pantalla iPhone 14 Pro" />
            </div>
            {/* Category + SKU */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Categoría *</label>
                <select value={currentForm.category} onChange={(e) => setCurrentForm({ ...currentForm, category: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">SKU</label>
                <input value={currentForm.sku} onChange={(e) => setCurrentForm({ ...currentForm, sku: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 font-mono"
                  placeholder="SKU-001" />
              </div>
            </div>
            {/* Brand + Supplier */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Marca</label>
                <input value={currentForm.brand} onChange={(e) => setCurrentForm({ ...currentForm, brand: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                  placeholder="Apple Original, Genérico, OEM" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Proveedor</label>
                <input value={currentForm.supplier} onChange={(e) => setCurrentForm({ ...currentForm, supplier: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                  placeholder="Nombre del proveedor" />
              </div>
            </div>
            {/* Compatible Models (multi-select) */}
            <div>
              <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Modelos Compatibles</label>
              <div className="mt-1 bg-slate-50 rounded-xl border border-slate-200 p-3 max-h-40 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {IPHONE_MODELS.map((model) => {
                    const selected = currentForm.compatible_models.includes(model);
                    return (
                      <button
                        type="button"
                        key={model}
                        onClick={() => {
                          const models = selected
                            ? currentForm.compatible_models.filter((m) => m !== model)
                            : [...currentForm.compatible_models, model];
                          setCurrentForm({ ...currentForm, compatible_models: models });
                        }}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all ${
                          selected ? "bg-primary text-white" : "bg-white border border-slate-200 text-cool-grey hover:border-primary/50"
                        }`}
                      >
                        {model}
                      </button>
                    );
                  })}
                </div>
              </div>
              {currentForm.compatible_models.length > 0 && (
                <p className="text-[10px] text-primary mt-1 font-medium">{currentForm.compatible_models.length} modelo(s) seleccionado(s)</p>
              )}
            </div>
            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Precio Costo (USD)</label>
                <input type="number" step="0.01" value={currentForm.cost_price}
                  onChange={(e) => setCurrentForm({ ...currentForm, cost_price: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                  placeholder="15" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Precio Venta (USD)</label>
                <input type="number" step="0.01" value={currentForm.sale_price}
                  onChange={(e) => setCurrentForm({ ...currentForm, sale_price: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                  placeholder="25" />
              </div>
            </div>
            {/* Stock */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Cantidad *</label>
                <input type="number" min={0} required value={currentForm.stock_qty}
                  onChange={(e) => setCurrentForm({ ...currentForm, stock_qty: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Stock Mín.</label>
                <input type="number" min={0} value={currentForm.min_stock}
                  onChange={(e) => setCurrentForm({ ...currentForm, min_stock: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Ubicación</label>
                <input value={currentForm.location} onChange={(e) => setCurrentForm({ ...currentForm, location: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                  placeholder="Estante A3" />
              </div>
            </div>
            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Notas</label>
              <textarea value={currentForm.notes} onChange={(e) => setCurrentForm({ ...currentForm, notes: e.target.value })}
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

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Stock — Repuestos y Accesorios</h2>
          <p className="text-on-surface-variant text-sm mt-1">Gestión de inventario de repuestos, accesorios y herramientas</p>
        </div>
      </div>

      {/* Alert Banner — stock bajo */}
      {lowStockCount > 0 && (
        <section className="mb-8 p-6 bg-red-50 border border-red-100 rounded-xl flex items-start gap-4">
          <span className="material-symbols-outlined text-red-500 mt-0.5">report</span>
          <div className="flex-1">
            <h4 className="text-sm font-bold text-red-800 mb-2">Alertas de Stock Bajo</h4>
            <p className="text-xs text-red-700">{lowStockCount} producto(s) con stock igual o inferior al mínimo</p>
            <button onClick={() => setLowStockOnly(!lowStockOnly)}
              className="mt-2 text-xs font-bold text-red-700 underline hover:text-red-900">
              {lowStockOnly ? "Mostrar todos" : "Ver solo stock bajo"}
            </button>
          </div>
        </section>
      )}

      {/* KPI Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Productos", value: totalProducts.toString(), icon: "inventory_2", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
          { label: "Stock Bajo", value: lowStockCount.toString(), icon: "warning", iconBg: "bg-red-50", iconColor: "text-red-600" },
          { label: "Valor Inventario", value: formatPrice(valorInventario), icon: "payments", iconBg: "bg-green-50", iconColor: "text-green-600" },
          { label: "Categorías", value: categoriesUsed.toString(), icon: "category", iconBg: "bg-purple-50", iconColor: "text-purple-600" },
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

      <div className="grid grid-cols-12 gap-8">
        {/* Categories Sidebar */}
        <div className="col-span-12 lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-cool-grey mb-4 px-2">Categoría</h3>
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setCategoryFilter("todos")}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  categoryFilter === "todos" ? "bg-white text-primary shadow-sm" : "text-cool-grey hover:bg-slate-100"
                }`}
              >
                <span className="material-symbols-outlined">list</span>
                Todos ({parts.length})
              </button>
              {CATEGORIES.map((cat) => {
                const count = parts.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                      categoryFilter === cat ? "bg-white text-primary shadow-sm" : "text-cool-grey hover:bg-slate-100"
                    }`}
                  >
                    <span className="material-symbols-outlined">{categoryIcon(cat)}</span>
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>
          {suppliers.length > 0 && (
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.15em] font-bold text-cool-grey mb-4 px-2">Proveedor</h3>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setSupplierFilter("todos")}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                    supplierFilter === "todos" ? "bg-white text-primary shadow-sm" : "text-cool-grey hover:bg-slate-100"
                  }`}
                >
                  Todos
                </button>
                {suppliers.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSupplierFilter(s)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all truncate ${
                      supplierFilter === s ? "bg-white text-primary shadow-sm" : "text-cool-grey hover:bg-slate-100"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                  placeholder="Buscar por nombre o SKU..."
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
                <span className="material-symbols-outlined text-lg">add</span> Agregar Repuesto
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-sm text-cool-grey">Cargando repuestos...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-cool-grey">
                <span className="material-symbols-outlined text-4xl mb-3">inventory_2</span>
                <p className="text-sm font-medium">No hay repuestos cargados</p>
                <p className="text-xs mt-1">Agregá tu primer repuesto con el botón de arriba</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Producto</th>
                        <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">SKU</th>
                        <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Categoría</th>
                        <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Marca</th>
                        <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Stock</th>
                        <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Precio</th>
                        <th className="px-4 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filtered.map((p) => {
                        const isLow = p.stock_qty <= p.min_stock;
                        return (
                          <tr
                            key={p.id}
                            onClick={() => setSelectedPart(p)}
                            className={`hover:bg-slate-50 transition-colors cursor-pointer group ${selectedPart?.id === p.id ? "bg-primary/5" : ""} ${isLow ? "bg-red-50/40" : ""}`}
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${categoryColor(p.category)}`}>
                                  <span className="material-symbols-outlined text-lg">{categoryIcon(p.category)}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-bold">{p.name}</p>
                                  {p.compatible_models.length > 0 && (
                                    <p className="text-[10px] text-on-surface-variant truncate max-w-[200px]">
                                      {p.compatible_models.slice(0, 3).join(", ")}{p.compatible_models.length > 3 ? ` +${p.compatible_models.length - 3}` : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 font-mono text-xs text-cool-grey">{p.sku || "—"}</td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-0.5 ${categoryColor(p.category)} text-[10px] font-bold rounded-full`}>{p.category}</span>
                            </td>
                            <td className="px-4 py-4 text-sm">{p.brand || "—"}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${isLow ? "text-red-600" : "text-on-surface"}`}>{p.stock_qty}</span>
                                {isLow && <span className="material-symbols-outlined text-red-500 text-sm">warning</span>}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm font-bold">{formatPrice(p.sale_price)}</td>
                            <td className="px-4 py-4 text-right">
                              <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-50 flex justify-between items-center text-xs font-medium text-cool-grey border-t border-slate-100">
                  <span>Mostrando {filtered.length} de {parts.length} repuestos</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="col-span-12 lg:col-span-3">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 sticky top-24">
            {selectedPart ? (
              <>
                <h2 className="text-xl font-black mb-6">Detalle del Repuesto</h2>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${categoryColor(selectedPart.category)}`}>
                    <span className="material-symbols-outlined text-3xl">{categoryIcon(selectedPart.category)}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary uppercase tracking-wider">{selectedPart.name}</p>
                    {selectedPart.sku && <p className="text-[10px] text-on-surface-variant font-mono mt-0.5">SKU: {selectedPart.sku}</p>}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: "Categoría", value: selectedPart.category },
                    { label: "Marca", value: selectedPart.brand || "—" },
                    { label: "Stock Actual", value: selectedPart.stock_qty.toString() },
                    { label: "Stock Mínimo", value: selectedPart.min_stock.toString() },
                  ].map((item) => (
                    <div key={item.label} className="bg-slate-50 p-3 rounded-xl">
                      <p className="text-[10px] text-cool-grey uppercase font-bold mb-0.5">{item.label}</p>
                      <p className="text-sm font-bold">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Stock alert */}
                {selectedPart.stock_qty <= selectedPart.min_stock && (
                  <div className="mb-5 flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <span className="material-symbols-outlined text-red-500 text-lg">warning</span>
                    <p className="text-xs font-medium text-red-800">Stock bajo — Reponer</p>
                  </div>
                )}

                {/* Precios */}
                <div className="mb-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Precios</h4>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Costo</span>
                      <span className="text-xs font-bold">{formatPrice(selectedPart.cost_price)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Venta</span>
                      <span className="text-xs font-bold">{formatPrice(selectedPart.sale_price)}</span>
                    </div>
                    {selectedPart.cost_price && selectedPart.sale_price && (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                        <span className="text-xs font-bold text-on-surface-variant">Ganancia</span>
                        <span className="text-sm font-black text-green-600">
                          {formatPrice(selectedPart.sale_price - selectedPart.cost_price)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Proveedor */}
                {selectedPart.supplier && (
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Proveedor</h4>
                    <p className="text-sm font-medium">{selectedPart.supplier}</p>
                  </div>
                )}

                {/* Ubicación */}
                {selectedPart.location && (
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Ubicación</h4>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-cool-grey text-sm">location_on</span>
                      <p className="text-sm font-medium">{selectedPart.location}</p>
                    </div>
                  </div>
                )}

                {/* Compatible Models */}
                {selectedPart.compatible_models.length > 0 && (
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Modelos Compatibles</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPart.compatible_models.map((m) => (
                        <span key={m} className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded-full">{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notas */}
                {selectedPart.notes && (
                  <div className="mb-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-cool-grey mb-3">Notas</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">{selectedPart.notes}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => openEditModal(selectedPart)}
                    className="flex-1 py-3 bg-slate-200 rounded-full text-xs font-bold hover:bg-slate-300 transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span> Editar
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-cool-grey">
                <span className="material-symbols-outlined text-4xl mb-3">touch_app</span>
                <p className="text-sm font-medium">Seleccioná un repuesto</p>
                <p className="text-xs mt-1">Hacé click en un producto de la tabla para ver sus detalles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Part Modal ── */}
      {showModal && renderPartForm(form, setForm, handleAddPart, () => setShowModal(false), "Agregar Repuesto", "Guardar Repuesto")}

      {/* ── Edit Part Modal ── */}
      {showEditModal && editingPart && renderPartForm(editForm, setEditForm, handleEditPart, () => setShowEditModal(false), "Editar Repuesto", "Guardar Cambios")}
    </>
  );
}
