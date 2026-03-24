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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <p className="text-sm font-semibold text-white/80">{title}</p>
          <button onClick={onClose} className="text-white/55 hover:text-white/60">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {/* Model */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Modelo *</label>
            <select required value={form.model} onChange={(e) => {
              const m = e.target.value;
              const spec = IPHONE_CATALOG[m];
              setForm({ ...form, model: m, capacity: spec ? spec.capacities[0] : "", color: spec ? spec.colors[0] : "" });
            }}
              className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors">
              <option value="">Seleccionar modelo...</option>
              {MODEL_NAMES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {/* IMEI */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">IMEI *</label>
            <input required value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })}
              className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors font-mono"
              placeholder="353912110891234" />
          </div>
          {/* Capacity + Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Capacidad</label>
              {form.model && IPHONE_CATALOG[form.model] ? (
                <select value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors">
                  {IPHONE_CATALOG[form.model].capacities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                  placeholder="128GB" />
              )}
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Color</label>
              {form.model && IPHONE_CATALOG[form.model] ? (
                <select value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors">
                  {IPHONE_CATALOG[form.model].colors.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                  placeholder="Negro" />
              )}
            </div>
          </div>
          {/* Condition + Battery */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Condición *</label>
              <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as "A" | "B" | "C" })}
                className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors">
                <option value="A">A — Impecable</option>
                <option value="B">B — Detalles menores</option>
                <option value="C">C — Uso visible</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Batería % *</label>
              <input type="number" min={0} max={100} required value={form.battery_health}
                onChange={(e) => setForm({ ...form, battery_health: parseInt(e.target.value) || 0 })}
                className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors" />
            </div>
          </div>
          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Precio Costo (USD)</label>
              <input type="number" step="0.01" value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                placeholder="400" />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Precio Venta (USD)</label>
              <input type="number" step="0.01" value={form.sale_price}
                onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                placeholder="450" />
            </div>
          </div>
          {/* New/Used toggle */}
          <div className="flex items-center gap-3">
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Tipo</label>
            <button type="button" onClick={() => setForm({ ...form, is_new: !form.is_new })}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${form.is_new ? "bg-white/[0.08] text-white/60" : "bg-white/[0.04] text-white/40"}`}>
              {form.is_new ? "Nuevo" : "Usado"}
            </button>
          </div>
          {/* Origin */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Origen *</label>
            <select value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value as "propio" | "consignacion" })}
              className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors">
              <option value="propio">Stock Propio</option>
              <option value="consignacion">Consignación</option>
            </select>
          </div>
          {form.origin === "consignacion" && (
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Dueño Consignación</label>
              <input value={form.consignment_owner} onChange={(e) => setForm({ ...form, consignment_owner: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                placeholder="Nombre del dueño" />
            </div>
          )}
          {/* Defects */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Defectos</label>
            <textarea value={form.defects} onChange={(e) => setForm({ ...form, defects: e.target.value })}
              className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors resize-none"
              rows={2} placeholder="Describir defectos si los hay..." />
          </div>
          {/* Notes */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors resize-none"
              rows={2} placeholder="Notas adicionales..." />
          </div>
          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-white/[0.05] border border-white/[0.08] text-white/50 text-sm rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-white/[0.1] border border-white/[0.12] text-white/80 text-sm font-semibold rounded-xl disabled:opacity-50">
              {saving ? "Guardando..." : submitLabel}
            </button>
          </div>
        </form>
        </div>
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
  const [saleForm, setSaleForm] = useState({ payment_method: "efectivo", sale_price: "", notes: "", client_name: "", client_phone: "", client_id: "" });
  const [savingSale, setSavingSale] = useState(false);
  const [saleConfirmation, setSaleConfirmation] = useState<{ product: Product; sale_price: number; payment_method: string } | null>(null);

  // Delete product
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);

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
      client_name: "",
      client_phone: "",
      client_id: "",
    });
    setSaleConfirmation(null);
    setShowSaleModal(true);
  }

  async function handleRegisterSale(e: React.FormEvent) {
    e.preventDefault();
    if (!saleProduct) return;
    setSavingSale(true);
    const finalPrice = parseFloat(saleForm.sale_price) || saleProduct.sale_price || 0;

    // Auto-create client if name provided and no client_id
    let clientId: string | null = saleForm.client_id || null;
    if (!clientId && saleForm.client_name) {
      // Check if client exists by phone or name
      let existingClient = null;
      if (saleForm.client_phone) {
        const { data } = await supabase.from("ig_clients").select("id").eq("phone", saleForm.client_phone).limit(1).maybeSingle();
        existingClient = data;
      }
      if (!existingClient && saleForm.client_name) {
        const { data } = await supabase.from("ig_clients").select("id").eq("name", saleForm.client_name).limit(1).maybeSingle();
        existingClient = data;
      }
      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Create new client
        const { data: newClient } = await supabase.from("ig_clients").insert({
          name: saleForm.client_name,
          phone: saleForm.client_phone || null,
        }).select("id").single();
        if (newClient) clientId = newClient.id;
      }
    }

    const payload: Record<string, unknown> = {
      product_id: saleProduct.id,
      sale_price: finalPrice,
      cost_price: saleProduct.cost_price || 0,
      payment_method: saleForm.payment_method,
      notes: saleForm.notes || null,
      client_name: saleForm.client_name || null,
      client_phone: saleForm.client_phone || null,
      client_id: clientId,
      sold_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("ig_sales").insert(payload);
    if (!error) {
      await supabase.from("ig_products").update({ status: "vendido", sold_at: new Date().toISOString() }).eq("id", saleProduct.id);
      // Activity log
      await supabase.from("ig_activity_log").insert({
        action: "sale",
        entity: "product",
        entity_id: saleProduct.id,
        description: `Vendido ${saleProduct.model} ${saleProduct.capacity} por $${finalPrice} USD`,
        created_at: new Date().toISOString(),
      });
      // Show confirmation instead of closing
      setSaleConfirmation({
        product: saleProduct,
        sale_price: finalPrice,
        payment_method: saleForm.payment_method,
      });
      await fetchData();
    } else {
      alert("Error al registrar venta: " + error.message);
    }
    setSavingSale(false);
  }

  /* Delete Product */
  async function handleDeleteProduct() {
    if (!selectedProduct) return;
    setDeletingProduct(true);
    const { error } = await supabase.from("ig_products").delete().eq("id", selectedProduct.id);
    if (!error) {
      await supabase.from("ig_activity_log").insert({
        action: "delete",
        entity: "product",
        entity_id: selectedProduct.id,
        description: `Eliminado ${selectedProduct.model} ${selectedProduct.capacity}`,
        created_at: new Date().toISOString(),
      });
      setSelectedProduct(null);
      setShowDeleteConfirm(false);
      await fetchData();
    } else {
      alert("Error al eliminar: " + error.message);
    }
    setDeletingProduct(false);
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
      <div className="flex items-center justify-center py-40">
        <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Disponibles", value: disponibles.toString(),       sub: "en stock"  },
          { label: "Reservados",  value: reservados.toString(),        sub: "con seña"  },
          { label: "Vendidos hoy",value: vendidosHoy.toString(),       sub: "hoy"       },
          { label: "Valor stock", value: formatPrice(valorStock),      sub: "disponible"},
        ].map((k) => (
          <div key={k.label} className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[19px] bg-[#161619] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-[11px] font-normal text-white/50 uppercase tracking-[0.14em] mb-4">{k.label}</p>
              <p className="text-[28px] font-medium text-white/90 leading-none tracking-tight">{k.value}</p>
              <p className="text-[11px] text-white/45 mt-1.5">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 flex-1 min-w-[200px] max-w-sm hover:border-white/[0.1] transition-colors">
          <span className="material-symbols-outlined text-white/50 text-base">search</span>
          <input className="bg-transparent text-sm text-white/70 placeholder:text-white/45 outline-none w-full" placeholder="Buscar por modelo o IMEI…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setAddForm(emptyProductForm); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <span className="material-symbols-outlined text-[16px]">add</span>Cargar
        </button>
        <button onClick={() => { const d = allProducts.find(p => p.status === "disponible"); if (d) openSaleModal(d); else alert("No hay equipos disponibles"); }}
          className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/60 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <span className="material-symbols-outlined text-[16px]">point_of_sale</span>Nueva Venta
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mb-5">
        {[
          { label: "Estado", opts: [["todos","Todos"],["disponible","Disponible"],["reservado","Reservado"],["vendido","Vendido"]], val: statusFilter, set: setStatusFilter },
          { label: "Tipo",   opts: [["todos","Todos"],["nuevo","Nuevo"],["usado","Usado"]], val: newFilter, set: setNewFilter },
          { label: "Cond.",  opts: [["todos","Todos"],["A","A"],["B","B"],["C","C"]], val: conditionFilter, set: setConditionFilter },
          { label: "Origen", opts: [["todos","Todos"],["propio","Propio"],["consignacion","Consignación"]], val: originFilter, set: setOriginFilter },
        ].map(group => (
          <div key={group.label} className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 mr-1">{group.label}</span>
            {group.opts.map(([key, lbl]) => (
              <button key={key} onClick={() => group.set(key)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${group.val === key ? 'bg-white/[0.1] text-white/80' : 'text-white/55 hover:text-white/50'}`}>
                {lbl}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Table full width + inline expandable detail */}
      <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
        <div className="rounded-[19px] bg-[#161619] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <span className="material-symbols-outlined text-white/10 text-4xl mb-3">inventory_2</span>
              <p className="text-sm text-white/50">No hay equipos para mostrar</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      {["","Equipo","IMEI","Cap.","Cond.","Bat.","Precio","Estado",""].map((h,i) => (
                        <th key={i} className="px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const isOpen = selectedProduct?.id === p.id;
                      return (
                        <>
                          {/* Main row */}
                          <tr key={p.id} onClick={() => setSelectedProduct(isOpen ? null : p)}
                            className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer ${isOpen ? 'bg-white/[0.04]' : ''} ${isOpen ? '' : 'last:border-0'}`}>
                            {/* chevron */}
                            <td className="pl-4 pr-1 py-3.5 w-6">
                              <span className={`material-symbols-outlined text-[16px] text-white/30 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>chevron_right</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div>
                                <p className="text-sm font-medium text-white/80">{p.model}</p>
                                <p className="text-[10px] text-white/55">{p.color}{p.is_new ? ' · NUEVO' : ''}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[11px] text-white/55">••••{p.imei.slice(-4)}</td>
                            <td className="px-4 py-3.5 text-sm text-white/60">{p.capacity}</td>
                            <td className="px-4 py-3.5">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                p.condition === 'A' ? 'bg-emerald-500/10 text-emerald-400' :
                                p.condition === 'B' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-red-500/10 text-red-400'
                              }`}>{p.condition}</span>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`text-sm font-medium ${p.battery_health > 85 ? 'text-emerald-400' : p.battery_health >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                                {p.battery_health}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-sm font-medium text-white/70">{formatPrice(p.sale_price)}</td>
                            <td className="px-4 py-3.5">
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                                p.status === 'disponible' ? 'bg-white/[0.07] text-white/50' :
                                p.status === 'reservado'  ? 'bg-amber-500/10 text-amber-400' :
                                'bg-white/[0.04] text-white/45'
                              }`}>
                                {p.status === 'disponible' ? 'Disponible' : p.status === 'reservado' ? 'Reservado' : 'Vendido'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              {p.status === 'disponible' && (
                                <button onClick={ev => { ev.stopPropagation(); openSaleModal(p); }}
                                  className="text-white/40 hover:text-white/70 transition-colors">
                                  <span className="material-symbols-outlined text-[18px]">sell</span>
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Inline detail row */}
                          {isOpen && (
                            <tr key={`${p.id}-detail`} className="border-b border-white/[0.05] bg-white/[0.02]">
                              <td colSpan={9} className="px-6 py-5">
                                <div className="grid grid-cols-[auto_1fr_auto] gap-6 items-start">

                                  {/* Col 1 — Fotos 2×2 */}
                                  <div className="grid grid-cols-2 gap-2 self-start pr-5 border-r border-white/[0.05]">
                                    {[...(p.photos || []), null, null, null, null].slice(0, 4).map((photo, n) => (
                                      <div key={n} className="w-[56px] h-[56px] rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center overflow-hidden">
                                        {photo
                                          // eslint-disable-next-line @next/next/no-img-element
                                          ? <img src={photo} alt="" className="w-full h-full object-cover" />
                                          : <span className="material-symbols-outlined text-white/10 text-base">image</span>
                                        }
                                      </div>
                                    ))}
                                  </div>

                                  {/* Col 2 — Datos del equipo */}
                                  <div className="grid grid-cols-4 gap-x-6 gap-y-3 content-start">
                                    {[
                                      { l: "IMEI",      v: p.imei, mono: true },
                                      { l: "Capacidad", v: p.capacity },
                                      { l: "Color",     v: p.color },
                                      { l: "Condición", v: `Grado ${p.condition}` },
                                      { l: "Batería",   v: `${p.battery_health}%` },
                                      { l: "Tipo",      v: p.is_new ? 'Nuevo' : 'Usado' },
                                      { l: "Origen",    v: p.origin === 'consignacion' ? `Consig. — ${p.consignment_owner || '?'}` : 'Stock propio' },
                                      ...(p.defects ? [{ l: "Defectos", v: p.defects }] : []),
                                    ].map(i => (
                                      <div key={i.l} className="flex flex-col gap-1">
                                        <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/40">{i.l}</span>
                                        <span className={`text-[13px] font-medium text-white/80 leading-tight ${(i as {mono?: boolean}).mono ? 'font-mono' : ''}`}>{i.v}</span>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Col 3 — Precios + Acciones side by side */}
                                  <div className="flex gap-3 self-start pl-5 border-l border-white/[0.05]">
                                    {/* Precios */}
                                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 space-y-2 min-w-[150px]">
                                      <div className="flex justify-between items-baseline gap-4">
                                        <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/35">Costo</span>
                                        <span className="text-[12px] font-medium text-white/55">{formatPrice(p.cost_price)}</span>
                                      </div>
                                      <div className="flex justify-between items-baseline gap-4">
                                        <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/35">Venta</span>
                                        <span className="text-[13px] font-semibold text-white/80">{formatPrice(p.sale_price)}</span>
                                      </div>
                                      {p.cost_price && p.sale_price && (
                                        <div className="flex justify-between items-baseline gap-4 pt-2 border-t border-white/[0.05]">
                                          <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/35">Ganancia</span>
                                          <span className="text-[13px] font-bold text-emerald-400">{formatPrice(p.sale_price - p.cost_price)}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Botones */}
                                    <div className="flex flex-col gap-1.5 justify-center min-w-[90px]">
                                      <button onClick={(e) => { e.stopPropagation(); openEditModal(p); }}
                                        className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white/55 text-xs font-medium rounded-xl transition-colors">
                                        <span className="material-symbols-outlined text-[14px]">edit</span>Editar
                                      </button>
                                      {p.status === 'disponible' && (
                                        <button onClick={(e) => { e.stopPropagation(); openSaleModal(p); }}
                                          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white/[0.1] hover:bg-white/[0.15] border border-white/[0.12] text-white/80 text-xs font-semibold rounded-xl transition-colors">
                                          <span className="material-symbols-outlined text-[14px]">sell</span>Vender
                                        </button>
                                      )}
                                      {p.status !== 'vendido' && !showDeleteConfirm && (
                                        <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                                          className="py-1.5 text-[11px] text-red-400/40 hover:text-red-400/70 transition-colors text-center">
                                          Eliminar
                                        </button>
                                      )}
                                      {p.status !== 'vendido' && showDeleteConfirm && (
                                        <div className="flex gap-1.5">
                                          <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }} className="flex-1 py-1.5 bg-white/[0.05] border border-white/[0.08] text-white/45 text-xs rounded-lg">No</button>
                                          <button onClick={(e) => { e.stopPropagation(); handleDeleteProduct(); }} disabled={deletingProduct} className="flex-1 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 text-xs rounded-lg disabled:opacity-50">
                                            {deletingProduct ? "…" : "Sí"}
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-white/[0.04]">
                <p className="text-[11px] text-white/45">{filtered.length} de {allProducts.length} equipos</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sale Modal */}
      {showSaleModal && saleProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => { if (!saleConfirmation) setShowSaleModal(false); }}>
          <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              {saleConfirmation ? (
                <div className="p-6 space-y-5 text-center">
                  <div>
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-emerald-400 text-2xl">check_circle</span>
                    </div>
                    <p className="text-base font-semibold text-white/80">Venta registrada</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 text-left space-y-2">
                    {[["Equipo", `${saleConfirmation.product.model} ${saleConfirmation.product.capacity}`], ["Precio", formatPrice(saleConfirmation.sale_price)], ["Pago", saleConfirmation.payment_method]].map(([l, v]) => (
                      <div key={l} className="flex justify-between"><span className="text-[11px] text-white/55">{l}</span><span className="text-[11px] font-medium text-white/60">{v}</span></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a href={`/ventas/print/garantia?product_id=${saleConfirmation.product.id}`} target="_blank" className="py-2.5 bg-white/[0.05] border border-white/[0.08] text-white/60 text-xs font-medium rounded-xl text-center hover:bg-white/[0.08] transition-colors">Garantía</a>
                    <a href={`/ventas/print/ticket?product_id=${saleConfirmation.product.id}`} target="_blank" className="py-2.5 bg-white/[0.05] border border-white/[0.08] text-white/60 text-xs font-medium rounded-xl text-center hover:bg-white/[0.08] transition-colors">Ticket</a>
                  </div>
                  <button onClick={() => { setShowSaleModal(false); setSaleProduct(null); setSaleConfirmation(null); }} className="w-full py-2.5 bg-white/[0.08] border border-white/[0.1] text-white/70 text-sm font-medium rounded-xl hover:bg-white/[0.12] transition-colors">Cerrar</button>
                </div>
              ) : (
                <>
                  <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                    <p className="text-sm font-semibold text-white/80">Registrar Venta</p>
                    <button onClick={() => setShowSaleModal(false)} className="text-white/55 hover:text-white/60"><span className="material-symbols-outlined text-[20px]">close</span></button>
                  </div>
                  <form onSubmit={handleRegisterSale} className="p-5 space-y-4">
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                      <p className="text-sm font-medium text-white/70">{saleProduct.model}</p>
                      <p className="text-[11px] text-white/55 font-mono">{saleProduct.imei}</p>
                      <p className="text-[11px] text-white/55 mt-0.5">{saleProduct.capacity} · {saleProduct.color} · Grado {saleProduct.condition}</p>
                    </div>
                    {[
                      { label: "Precio (USD)", type: "number", val: saleForm.sale_price, set: (v: string) => setSaleForm({...saleForm, sale_price: v}), required: true, step: "0.01" },
                    ].map(f => (
                      <div key={f.label}>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 block mb-1">{f.label}</label>
                        <input type={f.type} required={f.required} step={f.step} value={f.val} onChange={e => f.set(e.target.value)}
                          className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors" />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 block mb-1">Método de Pago</label>
                      <select value={saleForm.payment_method} onChange={e => setSaleForm({...saleForm, payment_method: e.target.value})}
                        className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none">
                        {["efectivo","transferencia","tarjeta_debito","tarjeta_credito","mixto"].map(o => <option key={o} value={o}>{o.replace("_"," ")}</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[["Nombre cliente", saleForm.client_name, (v: string) => setSaleForm({...saleForm, client_name: v})], ["Teléfono", saleForm.client_phone, (v: string) => setSaleForm({...saleForm, client_phone: v})]].map(([lbl, val, set]) => (
                        <div key={lbl as string}>
                          <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 block mb-1">{lbl as string}</label>
                          <input type="text" value={val as string} onChange={e => (set as (v: string) => void)(e.target.value)} placeholder="Opcional"
                            className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors" />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button type="button" onClick={() => setShowSaleModal(false)} className="flex-1 py-2.5 bg-white/[0.04] border border-white/[0.08] text-white/50 text-sm rounded-xl">Cancelar</button>
                      <button type="submit" disabled={savingSale} className="flex-1 py-2.5 bg-white/[0.1] border border-white/[0.12] text-white/80 text-sm font-semibold rounded-xl disabled:opacity-50">
                        {savingSale ? "Registrando…" : "Confirmar"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <ProductFormModal title="Cargar Equipo" form={addForm} setForm={setAddForm} onSubmit={handleAddProduct} onClose={() => setShowAddModal(false)} saving={savingAdd} submitLabel="Guardar Equipo" />
      )}
      {/* Edit Modal */}
      {showEditModal && editingProduct && (
        <ProductFormModal title="Editar Equipo" form={editForm} setForm={setEditForm} onSubmit={handleEditProduct} onClose={() => setShowEditModal(false)} saving={savingEdit} submitLabel="Guardar Cambios" />
      )}
    </>
  );
}
