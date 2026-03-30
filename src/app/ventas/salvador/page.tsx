"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

/* ───── Types ───── */
interface SalvadorItem {
  id: string;
  product_id: string | null;
  model: string;
  imei: string | null;
  capacity: string | null;
  color: string | null;
  condition_received: string | null;
  defects_received: string | null;
  defects_fixed: string | null;
  cost_price: number | null;
  sale_price: number | null;
  profit: number | null;
  salvador_cut: number | null;
  igreen_cut: number | null;
  status: "en_stock" | "vendido" | "devuelto";
  received_at: string | null;
  sold_at: string | null;
  notes: string | null;
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

/* ───── Split constants ───── */
const SALVADOR_PCT = 0.70;
const IGREEN_PCT = 0.30;

/* ───── Helpers ───── */
function formatPrice(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")} USD`;
}

function formatDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function calcCuts(salePrice: number, costPrice: number) {
  const profit = salePrice - costPrice;
  const salvadorCut = profit > 0 ? profit * SALVADOR_PCT : 0;
  const igreenCut = profit > 0 ? profit * IGREEN_PCT : 0;
  return { profit, salvadorCut, igreenCut };
}

/* ───── DarkSelect ───── */
function DarkSelect({
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full mt-1 px-4 py-2.5 bg-white/[0.04] border ${open ? "border-white/[0.2]" : "border-white/[0.08]"} rounded-lg text-sm text-left outline-none flex items-center justify-between transition-colors`}
      >
        <span className={selected ? "text-white/70" : "text-white/30"}>
          {selected ? selected.label : placeholder || "Seleccionar..."}
        </span>
        <span
          className={`material-symbols-outlined text-[16px] text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-[#1e1e22] border border-white/[0.1] shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {required ? null : placeholder && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-white/30 hover:bg-white/[0.04] transition-colors"
            >
              {placeholder}
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06] ${o.value === value ? "text-[#3eff8e] bg-[#3eff8e]/[0.06]" : "text-white/70"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Add Item Modal ───── */
const emptyAddForm = {
  model: "",
  imei: "",
  capacity: "",
  color: "",
  condition_received: "A",
  defects_received: "",
  cost_price: "",
  received_at: new Date().toISOString().slice(0, 10),
  notes: "",
};

function AddItemModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(emptyAddForm);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.model) return;
    setSaving(true);
    const payload = {
      model: form.model,
      imei: form.imei || null,
      capacity: form.capacity || null,
      color: form.color || null,
      condition_received: form.condition_received || null,
      defects_received: form.defects_received || null,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      received_at: form.received_at ? new Date(form.received_at).toISOString() : new Date().toISOString(),
      notes: form.notes || null,
      status: "en_stock",
    };
    const { error } = await supabase.from("ig_salvador_items").insert(payload);
    if (!error) {
      onSaved();
      onClose();
    } else {
      alert("Error al guardar: " + error.message);
    }
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] w-full max-w-lg max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] max-h-[calc(90vh-2px)] overflow-y-auto">
          <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-sm font-semibold text-white/80">Registrar Equipo de Salvador</p>
            <button onClick={onClose} className="text-white/55 hover:text-white/60">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Model */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Modelo *
              </label>
              <DarkSelect
                required
                value={form.model}
                placeholder="Seleccionar modelo..."
                onChange={(m) => {
                  const spec = IPHONE_CATALOG[m];
                  setForm({
                    ...form,
                    model: m,
                    capacity: spec ? spec.capacities[0] : "",
                    color: spec ? spec.colors[0] : "",
                  });
                }}
                options={MODEL_NAMES.map((m) => ({ value: m, label: m }))}
              />
            </div>
            {/* IMEI */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                IMEI
              </label>
              <input
                value={form.imei}
                onChange={(e) => setForm({ ...form, imei: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors font-mono"
                placeholder="353912110891234"
              />
            </div>
            {/* Capacity + Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Capacidad
                </label>
                {form.model && IPHONE_CATALOG[form.model] ? (
                  <DarkSelect
                    value={form.capacity}
                    onChange={(v) => setForm({ ...form, capacity: v })}
                    options={IPHONE_CATALOG[form.model].capacities.map((c) => ({ value: c, label: c }))}
                  />
                ) : (
                  <input
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                    placeholder="128GB"
                  />
                )}
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Color
                </label>
                {form.model && IPHONE_CATALOG[form.model] ? (
                  <DarkSelect
                    value={form.color}
                    onChange={(v) => setForm({ ...form, color: v })}
                    options={IPHONE_CATALOG[form.model].colors.map((c) => ({ value: c, label: c }))}
                  />
                ) : (
                  <input
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                    placeholder="Negro"
                  />
                )}
              </div>
            </div>
            {/* Condition */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Condición al recibir *
              </label>
              <DarkSelect
                value={form.condition_received}
                onChange={(v) => setForm({ ...form, condition_received: v })}
                options={[
                  { value: "A", label: "A — Impecable" },
                  { value: "B", label: "B — Detalles menores" },
                  { value: "C", label: "C — Uso visible" },
                ]}
              />
            </div>
            {/* Defects received */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Defectos al recibir
              </label>
              <textarea
                value={form.defects_received}
                onChange={(e) => setForm({ ...form, defects_received: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors resize-none"
                rows={2}
                placeholder="Describir defectos si los hay..."
              />
            </div>
            {/* Cost price + Received at */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Precio acordado (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.cost_price}
                  onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                  placeholder="400"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Fecha de ingreso
                </label>
                <input
                  type="date"
                  value={form.received_at}
                  onChange={(e) => setForm({ ...form, received_at: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                />
              </div>
            </div>
            {/* Notes */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Notas
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors resize-none"
                rows={2}
                placeholder="Notas adicionales..."
              />
            </div>
            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-white/[0.05] border border-white/[0.08] text-white/50 text-sm rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 bg-white/[0.1] border border-white/[0.12] text-white/80 text-sm font-semibold rounded-xl disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Registrar Equipo"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ───── Sell Modal ───── */
function SellModal({
  item,
  onClose,
  onSaved,
}: {
  item: SalvadorItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    sale_price: item.cost_price?.toString() || "",
    sold_at: new Date().toISOString().slice(0, 10),
    defects_fixed: "",
    notes: item.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const salePrice = parseFloat(form.sale_price) || 0;
  const costPrice = item.cost_price || 0;
  const { profit, salvadorCut, igreenCut } = calcCuts(salePrice, costPrice);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.sale_price) return;
    setSaving(true);
    const payload = {
      sale_price: salePrice,
      profit,
      salvador_cut: salvadorCut,
      igreen_cut: igreenCut,
      defects_fixed: form.defects_fixed || null,
      notes: form.notes || null,
      sold_at: form.sold_at ? new Date(form.sold_at).toISOString() : new Date().toISOString(),
      status: "vendido",
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("ig_salvador_items")
      .update(payload)
      .eq("id", item.id);
    if (!error) {
      onSaved();
      onClose();
    } else {
      alert("Error al registrar venta: " + error.message);
    }
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] w-full max-w-md max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] max-h-[calc(90vh-2px)] overflow-y-auto">
          <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-sm font-semibold text-white/80">Marcar como Vendido</p>
            <button onClick={onClose} className="text-white/55 hover:text-white/60">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="p-5 space-y-4">
            {/* Product info */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <p className="text-sm font-medium text-white/70">
                {item.model} {item.capacity}
              </p>
              <p className="text-[11px] text-white/45 mt-0.5 font-mono">{item.imei || "—"}</p>
              <p className="text-[11px] text-white/45 mt-0.5">
                {item.color} · Cond. {item.condition_received} · Costo {formatPrice(item.cost_price)}
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Sale price + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                    Precio de venta (USD) *
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.sale_price}
                    onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                    placeholder="450"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                    Fecha de venta *
                  </label>
                  <input
                    required
                    type="date"
                    value={form.sold_at}
                    onChange={(e) => setForm({ ...form, sold_at: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                  />
                </div>
              </div>
              {/* Live preview */}
              {salePrice > 0 && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35 mb-3">
                    Cálculo automático (70/30)
                  </p>
                  {[
                    { l: "Ganancia bruta", v: formatPrice(profit), color: profit >= 0 ? "text-white/70" : "text-red-400" },
                    { l: `Salvador (${Math.round(SALVADOR_PCT * 100)}%)`, v: formatPrice(salvadorCut), color: "text-amber-400" },
                    { l: `iGreen (${Math.round(IGREEN_PCT * 100)}%)`, v: formatPrice(igreenCut), color: "text-[#3eff8e]" },
                  ].map((row) => (
                    <div key={row.l} className="flex items-center justify-between">
                      <span className="text-[11px] text-white/45">{row.l}</span>
                      <span className={`text-[13px] font-semibold ${row.color}`}>{row.v}</span>
                    </div>
                  ))}
                </div>
              )}
              {/* Defects fixed */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Reparaciones realizadas
                </label>
                <textarea
                  value={form.defects_fixed}
                  onChange={(e) => setForm({ ...form, defects_fixed: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors resize-none"
                  rows={2}
                  placeholder="Pantalla, batería, carcasa..."
                />
              </div>
              {/* Notes */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Notas
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors resize-none"
                  rows={2}
                  placeholder="Notas adicionales..."
                />
              </div>
              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 bg-white/[0.05] border border-white/[0.08] text-white/50 text-sm rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#3eff8e]/10 border border-[#3eff8e]/20 text-[#3eff8e] text-sm font-semibold rounded-xl disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Confirmar Venta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── Main Page ───── */
export default function SalvadorPage() {
  const [items, setItems] = useState<SalvadorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<SalvadorItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sellItem, setSellItem] = useState<SalvadorItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("ig_salvador_items")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setItems(data as SalvadorItem[]);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── KPIs ── */
  const enStock = items.filter((i) => i.status === "en_stock");
  const vendidos = items.filter((i) => i.status === "vendido");
  const devueltos = items.filter((i) => i.status === "devuelto");

  const gananciaIGreen = vendidos.reduce((sum, i) => sum + (i.igreen_cut || 0), 0);
  const pendienteSalvador = vendidos
    .filter((i) => (i.salvador_cut || 0) > 0)
    .reduce((sum, i) => sum + (i.salvador_cut || 0), 0);

  /* ── Filters ── */
  const filtered = items.filter((i) => {
    if (statusFilter !== "todos" && i.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !i.model.toLowerCase().includes(q) &&
        !(i.imei || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: "calc(100vh - 56px)" }}
      >
        <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="px-8 py-8 overflow-y-auto flex-1">
        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-semibold text-white/85 leading-tight">
              Salvador — Consignación
            </h1>
            <p className="text-[12px] text-white/40 mt-0.5">
              Equipos recibidos en consignación · Split 70% Salvador / 30% iGreen sobre ganancia
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Registrar equipo
          </button>
        </div>

        {/* ── KPI summary cards ── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "En stock",
              value: enStock.length.toString(),
              sub: "equipos actuales",
              icon: "inventory_2",
              accent: false,
            },
            {
              label: "Vendidos",
              value: vendidos.length.toString(),
              sub: `${devueltos.length} devueltos`,
              icon: "sell",
              accent: false,
            },
            {
              label: "Ganancia iGreen",
              value: formatPrice(gananciaIGreen),
              sub: `${Math.round(IGREEN_PCT * 100)}% del profit`,
              icon: "trending_up",
              accent: true,
            },
            {
              label: "Pend. a pagar Salvador",
              value: formatPrice(pendienteSalvador),
              sub: `${Math.round(SALVADOR_PCT * 100)}% del profit`,
              icon: "handshake",
              accent: false,
            },
          ].map((k) => (
            <div
              key={k.label}
              className="rounded-[18px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]"
            >
              <div className="rounded-[17px] bg-[#161619] px-5 py-4 h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                    {k.label}
                  </p>
                  <span className="material-symbols-outlined text-[16px] text-white/15">
                    {k.icon}
                  </span>
                </div>
                <div className="mt-3">
                  <p
                    className={`text-[26px] font-medium leading-none tracking-tight ${k.accent ? "text-[#3eff8e]" : "text-white/90"}`}
                  >
                    {k.value}
                  </p>
                  <p className="text-[11px] text-white/35 mt-1">{k.sub}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 flex-1 hover:border-white/[0.1] transition-colors">
            <span className="material-symbols-outlined text-white/40 text-base">search</span>
            <input
              className="bg-transparent text-sm text-white/70 placeholder:text-white/35 outline-none w-full"
              placeholder="Buscar por modelo o IMEI…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {/* Status filter chips */}
          <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2">
            {[
              { val: "todos", label: "Todos" },
              { val: "en_stock", label: "En stock" },
              { val: "vendido", label: "Vendidos" },
              { val: "devuelto", label: "Devueltos" },
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setStatusFilter(val)}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                  statusFilter === val
                    ? "bg-[#3eff8e]/15 text-[#3eff8e] border border-[#3eff8e]/20"
                    : "text-white/40 hover:text-white/60 hover:bg-white/[0.05]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Export */}
          <button
            onClick={() => {
              const headers = [
                "Modelo",
                "IMEI",
                "Capacidad",
                "Color",
                "Condición",
                "Defectos recibido",
                "Defectos arreglados",
                "Costo",
                "Precio venta",
                "Ganancia",
                "Salvador (70%)",
                "iGreen (30%)",
                "Estado",
                "Fecha ingreso",
                "Fecha venta",
              ];
              const rows = filtered.map((i) => [
                i.model,
                i.imei || "",
                i.capacity || "",
                i.color || "",
                i.condition_received || "",
                i.defects_received || "",
                i.defects_fixed || "",
                i.cost_price ?? "",
                i.sale_price ?? "",
                i.profit ?? "",
                i.salvador_cut ?? "",
                i.igreen_cut ?? "",
                i.status,
                formatDate(i.received_at),
                formatDate(i.sold_at),
              ]);
              const csv = [headers, ...rows]
                .map((r) =>
                  r
                    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                    .join(",")
                )
                .join("\n");
              const blob = new Blob([csv], {
                type: "text/csv;charset=utf-8;",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `salvador-consignacion-${new Date()
                .toISOString()
                .slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/55 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Exportar
          </button>
        </div>

        {/* ── Table ── */}
        <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
          <div className="rounded-[19px] bg-[#161619] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <span className="material-symbols-outlined text-white/10 text-4xl mb-3">
                  handshake
                </span>
                <p className="text-sm text-white/50">
                  {items.length === 0
                    ? "Aún no hay equipos registrados de Salvador"
                    : "No hay equipos para los filtros actuales"}
                </p>
                {items.length === 0 && (
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] text-white/55 text-sm px-4 py-2 rounded-xl hover:bg-white/[0.1] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Registrar primer equipo
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/[0.05]">
                        {[
                          "",
                          "Equipo",
                          "IMEI",
                          "Condición",
                          "Defectos",
                          "Costo",
                          "Precio venta",
                          "Ganancia",
                          "Salvador (70%)",
                          "iGreen (30%)",
                          "Estado",
                          "Fecha venta",
                          "",
                        ].map((h, i) => (
                          <th
                            key={i}
                            className={`px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 whitespace-nowrap ${i > 0 && i < 12 ? "border-l border-white/[0.04]" : ""}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item) => {
                        const isOpen = selectedItem?.id === item.id;
                        return (
                          <>
                            {/* Main row */}
                            <tr
                              key={item.id}
                              onClick={() =>
                                setSelectedItem(isOpen ? null : item)
                              }
                              className={`border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer ${isOpen ? "bg-white/[0.04]" : ""}`}
                            >
                              {/* chevron */}
                              <td className="pl-4 pr-1 py-3.5 w-6">
                                <span
                                  className={`material-symbols-outlined text-[16px] text-white/30 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                                >
                                  chevron_right
                                </span>
                              </td>
                              {/* Equipo */}
                              <td className="px-4 py-3.5 border-l border-white/[0.04]">
                                <div>
                                  <p className="text-sm font-medium text-white/80">
                                    {item.model}
                                  </p>
                                  <p className="text-[10px] text-white/40">
                                    {[item.capacity, item.color]
                                      .filter(Boolean)
                                      .join(" · ")}
                                  </p>
                                </div>
                              </td>
                              {/* IMEI */}
                              <td className="px-4 py-3.5 font-mono text-[11px] text-white/55 border-l border-white/[0.04]">
                                {item.imei
                                  ? `••••${item.imei.slice(-4)}`
                                  : "—"}
                              </td>
                              {/* Condición */}
                              <td className="px-4 py-3.5 border-l border-white/[0.04]">
                                <span
                                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                    item.condition_received === "A"
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : item.condition_received === "B"
                                        ? "bg-amber-500/10 text-amber-400"
                                        : "bg-red-500/10 text-red-400"
                                  }`}
                                >
                                  Grado {item.condition_received || "—"}
                                </span>
                              </td>
                              {/* Defectos */}
                              <td className="px-4 py-3.5 text-[12px] text-white/40 max-w-[120px] border-l border-white/[0.04]">
                                <span className="line-clamp-1">
                                  {item.defects_received || "—"}
                                </span>
                              </td>
                              {/* Costo */}
                              <td className="px-4 py-3.5 text-sm text-white/55 border-l border-white/[0.04]">
                                {formatPrice(item.cost_price)}
                              </td>
                              {/* Precio venta */}
                              <td className="px-4 py-3.5 text-sm font-medium text-white/75 border-l border-white/[0.04]">
                                {item.status === "vendido"
                                  ? formatPrice(item.sale_price)
                                  : "—"}
                              </td>
                              {/* Ganancia */}
                              <td className="px-4 py-3.5 border-l border-white/[0.04]">
                                {item.profit !== null && item.profit !== undefined ? (
                                  <span
                                    className={`text-sm font-semibold ${item.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}
                                  >
                                    {formatPrice(item.profit)}
                                  </span>
                                ) : (
                                  <span className="text-sm text-white/25">—</span>
                                )}
                              </td>
                              {/* Salvador cut */}
                              <td className="px-4 py-3.5 border-l border-white/[0.04]">
                                {item.salvador_cut !== null && item.salvador_cut !== undefined ? (
                                  <span className="text-sm font-medium text-amber-400">
                                    {formatPrice(item.salvador_cut)}
                                  </span>
                                ) : (
                                  <span className="text-sm text-white/25">—</span>
                                )}
                              </td>
                              {/* iGreen cut */}
                              <td className="px-4 py-3.5 border-l border-white/[0.04]">
                                {item.igreen_cut !== null && item.igreen_cut !== undefined ? (
                                  <span className="text-sm font-medium text-[#3eff8e]">
                                    {formatPrice(item.igreen_cut)}
                                  </span>
                                ) : (
                                  <span className="text-sm text-white/25">—</span>
                                )}
                              </td>
                              {/* Status */}
                              <td className="px-4 py-3.5 border-l border-white/[0.04]">
                                <span
                                  className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                                    item.status === "en_stock"
                                      ? "bg-white/[0.07] text-white/50"
                                      : item.status === "vendido"
                                        ? "bg-[#3eff8e]/10 text-[#3eff8e]"
                                        : "bg-amber-500/10 text-amber-400"
                                  }`}
                                >
                                  {item.status === "en_stock"
                                    ? "En stock"
                                    : item.status === "vendido"
                                      ? "Vendido"
                                      : "Devuelto"}
                                </span>
                              </td>
                              {/* Fecha venta */}
                              <td className="px-4 py-3.5 text-[12px] text-white/45 border-l border-white/[0.04] whitespace-nowrap">
                                {item.status === "vendido"
                                  ? formatDate(item.sold_at)
                                  : <span className="text-white/20">—</span>}
                              </td>
                              {/* Action */}
                              <td className="px-4 py-3.5 text-right border-l border-white/[0.04]">
                                {item.status === "en_stock" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSellItem(item);
                                    }}
                                    className="flex items-center gap-1 bg-[#3eff8e]/10 hover:bg-[#3eff8e]/20 text-[#3eff8e] text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap"
                                  >
                                    <span className="material-symbols-outlined text-[13px]">sell</span>
                                    Vender
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* Inline expanded detail row */}
                            {isOpen && (
                              <tr
                                key={`${item.id}-detail`}
                                className="border-b border-white/[0.05] bg-white/[0.02]"
                              >
                                {/* Zone 1 — Detail grid */}
                                <td colSpan={7} className="px-5 py-4 align-top border-r border-white/[0.05]">
                                  <div className="grid grid-cols-4 gap-x-8 gap-y-4">
                                    {[
                                      {
                                        l: "IMEI",
                                        v: item.imei || "—",
                                        mono: true,
                                      },
                                      {
                                        l: "Capacidad",
                                        v: item.capacity || "—",
                                      },
                                      { l: "Color", v: item.color || "—" },
                                      {
                                        l: "Condición recibida",
                                        v: item.condition_received
                                          ? `Grado ${item.condition_received}`
                                          : "—",
                                      },
                                      {
                                        l: "Defectos recibidos",
                                        v: item.defects_received || "—",
                                      },
                                      {
                                        l: "Reparaciones",
                                        v: item.defects_fixed || "—",
                                      },
                                      {
                                        l: "Fecha ingreso",
                                        v: formatDate(item.received_at),
                                      },
                                      {
                                        l: "Notas",
                                        v: item.notes || "—",
                                      },
                                    ].map((i) => (
                                      <div
                                        key={i.l}
                                        className="flex flex-col gap-1"
                                      >
                                        <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/40">
                                          {i.l}
                                        </span>
                                        <span
                                          className={`text-[13px] font-medium text-white/80 leading-tight ${(i as { mono?: boolean }).mono ? "font-mono text-[11px]" : ""}`}
                                        >
                                          {i.v}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>

                                {/* Zone 2 — Finances + Actions */}
                                <td colSpan={6} className="px-5 py-4 align-top">
                                  <div className="flex gap-3 h-full">
                                    {/* Finances breakdown */}
                                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2.5 flex-1">
                                      <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/35 mb-3">
                                        Desglose financiero
                                      </p>
                                      {[
                                        {
                                          l: "Precio acordado",
                                          v: formatPrice(item.cost_price),
                                          cls: "text-white/55",
                                        },
                                        {
                                          l: "Precio de venta",
                                          v:
                                            item.status === "vendido"
                                              ? formatPrice(item.sale_price)
                                              : "—",
                                          cls: "text-white/75",
                                        },
                                        {
                                          l: "Ganancia bruta",
                                          v:
                                            item.profit !== null &&
                                            item.profit !== undefined
                                              ? formatPrice(item.profit)
                                              : "—",
                                          cls:
                                            (item.profit || 0) >= 0
                                              ? "text-emerald-400"
                                              : "text-red-400",
                                        },
                                        {
                                          l: `Salvador ${Math.round(SALVADOR_PCT * 100)}%`,
                                          v:
                                            item.salvador_cut !== null &&
                                            item.salvador_cut !== undefined
                                              ? formatPrice(item.salvador_cut)
                                              : "—",
                                          cls: "text-amber-400",
                                        },
                                        {
                                          l: `iGreen ${Math.round(IGREEN_PCT * 100)}%`,
                                          v:
                                            item.igreen_cut !== null &&
                                            item.igreen_cut !== undefined
                                              ? formatPrice(item.igreen_cut)
                                              : "—",
                                          cls: "text-[#3eff8e]",
                                        },
                                      ].map((row) => (
                                        <div
                                          key={row.l}
                                          className="flex justify-between items-baseline"
                                        >
                                          <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/35">
                                            {row.l}
                                          </span>
                                          <span
                                            className={`text-[13px] font-semibold ${row.cls}`}
                                          >
                                            {row.v}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                    {/* Action buttons */}
                                    <div className="flex flex-col gap-1.5 justify-center w-[110px]">
                                      {item.status === "en_stock" && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSellItem(item);
                                          }}
                                          className="flex items-center justify-center gap-1.5 py-2.5 bg-[#3eff8e]/10 hover:bg-[#3eff8e]/20 border border-[#3eff8e]/20 text-[#3eff8e] text-xs font-semibold rounded-xl transition-colors w-full"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">sell</span>
                                          Vender
                                        </button>
                                      )}
                                      {item.status === "en_stock" && (
                                        <button
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!confirm("¿Marcar como devuelto a Salvador?")) return;
                                            await supabase
                                              .from("ig_salvador_items")
                                              .update({
                                                status: "devuelto",
                                                updated_at: new Date().toISOString(),
                                              })
                                              .eq("id", item.id);
                                            setSelectedItem(null);
                                            fetchData();
                                          }}
                                          className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-xs font-medium rounded-xl transition-colors w-full"
                                        >
                                          <span className="material-symbols-outlined text-[14px]">undo</span>
                                          Devolver
                                        </button>
                                      )}
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
                  <p className="text-[11px] text-white/45">
                    {filtered.length} de {items.length} equipos
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
      {showAddModal && (
        <AddItemModal
          onClose={() => setShowAddModal(false)}
          onSaved={fetchData}
        />
      )}
      {sellItem && (
        <SellModal
          item={sellItem}
          onClose={() => setSellItem(null)}
          onSaved={fetchData}
        />
      )}
    </>
  );
}
