"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

/* ───── types ───── */
interface Product {
  id: string;
  product_code: string | null;
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
  photos: [] as string[],
};

const BUCKET = "product-photos";
const SUPABASE_URL = "https://iglfukxthrmprnqergbz.supabase.co";

/* ───── Inline Photo Uploader (no productId needed) ───── */
function InlinePhotoUploader({ photos, onChange }: { photos: string[]; onChange: (p: string[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading(true);
    setUploadError("");
    const newUrls: string[] = [];

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      setUploadProgress(`Subiendo ${i + 1}/${arr.length}...`);

      // Detect extension — HEIC support
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      let contentType = file.type;
      if (!contentType || contentType === "application/octet-stream") {
        // iPhone HEIC sin content-type
        if (ext === "heic" || ext === "heif") {
          contentType = "image/heic";
        } else {
          contentType = "image/jpeg";
        }
      }
      // Force HEIC to be uploaded as-is (browsers that support it will show it)
      const path = `tmp/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType, upsert: false });
      if (error) {
        setUploadError(`Error en ${file.name}: ${error.message}`);
        console.error("Upload error:", error);
        continue;
      }
      newUrls.push(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`);
    }

    if (newUrls.length > 0) onChange([...photos, ...newUrls]);
    setUploading(false);
    setUploadProgress("");
  }

  function removePhoto(url: string) {
    const path = url.split(`/public/${BUCKET}/`)[1];
    if (path) supabase.storage.from(BUCKET).remove([path]);
    onChange(photos.filter((p) => p !== url));
  }

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Fotos del Equipo</label>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <div key={url} className="relative group aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover rounded-xl border border-white/[0.07]" />
              {i === 0 && <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-white/20 text-white/80 px-1.5 py-0.5 rounded-full">Principal</span>}
              <button onClick={() => removePhoto(url)} type="button" className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                <span className="material-symbols-outlined text-[12px] text-white/70">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${dragOver ? "border-white/30 bg-white/[0.06]" : "border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.16]"}`}
      >
        {uploading ? (
          <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/30" /><p className="text-xs text-white/45">{uploadProgress || "Subiendo..."}</p></>
        ) : (
          <><span className="material-symbols-outlined text-2xl text-white/25">add_photo_alternate</span>
          <p className="text-xs text-white/50 text-center"><span className="font-bold text-white/65">Click</span> o arrastrá las fotos · múltiples a la vez</p>
          <p className="text-[10px] text-white/30">JPG, PNG, HEIC, WEBP · máx 10MB c/u</p></>
        )}
        <input ref={inputRef} type="file" accept="image/*,image/heic,image/heif" multiple className="hidden" onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
      </div>
      {uploadError && (
        <p className="text-[11px] text-white/45 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2">⚠️ {uploadError}</p>
      )}
      {photos.length > 0 && <p className="text-[10px] text-white/30 text-center">La primera foto es la principal · Hover para eliminar</p>}
    </div>
  );
}

/* ───── helpers ───── */


function formatPrice(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `$${n.toLocaleString("es-AR")} USD`;
}

/* ───── Dark Select ───── */
function DarkSelect({ value, onChange, options, placeholder, required }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full mt-1 px-4 py-2.5 bg-white/[0.04] border ${open ? 'border-white/[0.2]' : 'border-white/[0.08]'} rounded-lg text-sm text-left outline-none flex items-center justify-between transition-colors`}>
        <span className={selected ? 'text-white/70' : 'text-white/30'}>{selected ? selected.label : (placeholder || 'Seleccionar...')}</span>
        <span className={`material-symbols-outlined text-[16px] text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-[#1e1e22] border border-white/[0.1] shadow-xl overflow-hidden max-h-56 overflow-y-auto">
          {required ? null : placeholder && (
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className="w-full px-4 py-2.5 text-left text-sm text-white/30 hover:bg-white/[0.04] transition-colors">
              {placeholder}
            </button>
          )}
          {options.map(o => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/[0.06] ${o.value === value ? 'text-[#3eff8e] bg-[#3eff8e]/[0.06]' : 'text-white/70'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
      <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] w-full max-w-lg max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] max-h-[calc(90vh-2px)] overflow-y-auto">
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
            <DarkSelect required value={form.model} placeholder="Seleccionar modelo..."
              onChange={(m) => { const spec = IPHONE_CATALOG[m]; setForm({ ...form, model: m, capacity: spec ? spec.capacities[0] : "", color: spec ? spec.colors[0] : "" }); }}
              options={MODEL_NAMES.map(m => ({ value: m, label: m }))} />
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
                <DarkSelect value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })}
                  options={IPHONE_CATALOG[form.model].capacities.map(c => ({ value: c, label: c }))} />
              ) : (
                <input value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors"
                  placeholder="128GB" />
              )}
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Color</label>
              {form.model && IPHONE_CATALOG[form.model] ? (
                <DarkSelect value={form.color} onChange={(v) => setForm({ ...form, color: v })}
                  options={IPHONE_CATALOG[form.model].colors.map(c => ({ value: c, label: c }))} />
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
              <DarkSelect value={form.condition} onChange={(v) => setForm({ ...form, condition: v as "A" | "B" | "C" })}
                options={[{ value: 'A', label: 'A — Impecable' }, { value: 'B', label: 'B — Detalles menores' }, { value: 'C', label: 'C — Uso visible' }]} />
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
            <DarkSelect value={form.origin} onChange={(v) => setForm({ ...form, origin: v as "propio" | "consignacion" })}
              options={[{ value: 'propio', label: 'Stock Propio' }, { value: 'consignacion', label: 'Consignación' }]} />
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
          {/* Photos */}
          <InlinePhotoUploader photos={form.photos} onChange={(p) => setForm({ ...form, photos: p })} />
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

/* ───── Mobile Card View ───── */
function MobileProductCard({
  p,
  onSell,
  onEdit,
  onLabel,
}: {
  p: Product;
  onSell: (p: Product) => void;
  onEdit: (p: Product) => void;
  onLabel: (p: Product) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const days = p.status !== "vendido"
    ? Math.floor((Date.now() - new Date(p.loaded_at || p.created_at).getTime()) / 86400000)
    : null;

  return (
    <div className="rounded-[16px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
      <div className="rounded-[15px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] overflow-hidden">
        {/* Main row */}
        <div className="px-4 py-3.5 flex items-center gap-3" onClick={() => setExpanded(e => !e)}>
          {/* Photo or placeholder */}
          <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center overflow-hidden shrink-0">
            {p.photos?.[0]
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={p.photos[0]} alt="" className="w-full h-full object-cover" />
              : <span className="material-symbols-outlined text-white/15 text-lg">smartphone</span>
            }
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white/80 truncate">{p.model}</p>
            <p className="text-[10px] text-white/40 font-mono truncate">{p.product_code || '—'} · {p.capacity} · {p.color}</p>
          </div>
          {/* Right side */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="text-sm font-semibold text-white/75">{formatPrice(p.sale_price)}</p>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                p.condition === 'A' ? 'bg-emerald-500/10 text-emerald-400' :
                p.condition === 'B' ? 'bg-amber-500/10 text-amber-400' :
                'bg-red-500/10 text-red-400'
              }`}>{p.condition}</span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                p.status === 'disponible' ? 'bg-white/[0.07] text-white/50' :
                p.status === 'reservado' ? 'bg-amber-500/10 text-amber-400' :
                'bg-white/[0.04] text-white/35'
              }`}>
                {p.status === 'disponible' ? 'Disp.' : p.status === 'reservado' ? 'Res.' : 'Vend.'}
              </span>
            </div>
          </div>
          <span className={`material-symbols-outlined text-[16px] text-white/25 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>chevron_right</span>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="border-t border-white/[0.05] px-4 py-4 space-y-4">
            {/* Photos row */}
            {p.photos && p.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {p.photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/[0.07] shrink-0" />
                ))}
              </div>
            )}
            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: "IMEI", v: p.imei, mono: true },
                { l: "Batería", v: `${p.battery_health}%` },
                { l: "Origen", v: p.origin === 'consignacion' ? `Consig. ${p.consignment_owner || ''}` : 'Propio' },
                { l: "Tipo", v: p.is_new ? 'Nuevo' : 'Usado' },
                ...(p.defects ? [{ l: "Defectos", v: p.defects, mono: false }] : []),
                ...(days !== null ? [{ l: "Días en stock", v: `${days}d`, mono: false }] : []),
              ].map(item => (
                <div key={item.l} className="bg-white/[0.02] rounded-xl p-3">
                  <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/35 mb-1">{item.l}</p>
                  <p className={`text-[12px] font-medium text-white/75 break-all ${item.mono ? 'font-mono text-[10px]' : ''}`}>{item.v}</p>
                </div>
              ))}
            </div>
            {/* Prices row */}
            <div className="flex gap-2">
              {[
                { l: "Costo", v: formatPrice(p.cost_price), dim: true },
                { l: "Venta", v: formatPrice(p.sale_price), dim: false },
                ...(p.cost_price && p.sale_price ? [{ l: "Ganancia", v: formatPrice(p.sale_price - p.cost_price), dim: false }] : []),
              ].map(item => (
                <div key={item.l} className="flex-1 bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 text-center">
                  <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/30 mb-1">{item.l}</p>
                  <p className={`text-[12px] font-semibold ${item.l === 'Ganancia' ? 'text-emerald-400' : item.dim ? 'text-white/45' : 'text-white/75'}`}>{item.v}</p>
                </div>
              ))}
            </div>
            {/* Action buttons */}
            <div className="flex gap-2">
              {p.status === 'disponible' && (
                <button onClick={() => onSell(p)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#3eff8e]/10 border border-[#3eff8e]/20 text-[#3eff8e] text-sm font-semibold rounded-xl">
                  <span className="material-symbols-outlined text-[15px]">sell</span>Vender
                </button>
              )}
              <button onClick={() => onEdit(p)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white/[0.05] border border-white/[0.08] text-white/55 text-sm font-medium rounded-xl">
                <span className="material-symbols-outlined text-[15px]">edit</span>Editar
              </button>
              <button onClick={() => onLabel(p)}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white/[0.05] border border-white/[0.08] text-white/55 text-sm font-medium rounded-xl">
                <span className="material-symbols-outlined text-[15px]">label</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── component ───── */
export default function VentasStockPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [conditionFilter, setConditionFilter] = useState<string>("todos");
  const [originFilter, setOriginFilter] = useState<string>("todos");
  const [newFilter, setNewFilter] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Sale modal
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [saleForm, setSaleForm] = useState({ payment_method: "efectivo", sale_price: "", notes: "", client_name: "", client_last_name: "", client_phone: "", client_id: "", client_dni: "", client_email: "", extended_warranty: false });
  const [savingSale, setSavingSale] = useState(false);
  const [saleConfirmation, setSaleConfirmation] = useState<{ product: Product; sale_price: number; payment_method: string } | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [clientResults, setClientResults] = useState<{id:string;name:string;last_name:string|null;phone:string;dni:string;email:string}[]>([]);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
  const monthStr = now.toISOString().slice(0, 7);

  const disponibles = allProducts.filter((p) => p.status === "disponible").length;
  const reservados = allProducts.filter((p) => p.status === "reservado").length;
  const vendidosHoy = sales.filter((s) => (s.sold_at || s.created_at).startsWith(todayStr)).length;
  const valorStock = allProducts
    .filter((p) => p.status === "disponible")
    .reduce((sum, p) => sum + (p.sale_price || 0), 0);

  const gananciaMes = sales
    .filter((s) => (s.sold_at || s.created_at).startsWith(monthStr))
    .reduce((sum, s) => sum + ((s.sale_price || 0) - (s.cost_price || 0)), 0);

  const OBJETIVO_MES = 2000;
  const objetivoPct = Math.min(100, Math.round((gananciaMes / OBJETIVO_MES) * 100));

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
      client_last_name: "",
      client_phone: "",
      client_id: "",
      client_dni: "",
      client_email: "",
      extended_warranty: false,
    });
    setSaleConfirmation(null);
    setClientSearch("");
    setClientResults([]);
    setShowClientDropdown(false);
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
          last_name: saleForm.client_last_name || null,
          phone: saleForm.client_phone || null,
          dni: saleForm.client_dni || null,
          email: saleForm.client_email || null,
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
      client_last_name: saleForm.client_last_name || null,
      client_phone: saleForm.client_phone || null,
      client_dni: saleForm.client_dni || null,
      client_email: saleForm.client_email || null,
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
  function printLabel(p: Product) {
    const w = window.open('', '_blank', 'width=400,height=300');
    if (!w) return;
    const condLabel = p.condition === 'A' ? 'Grado A — Excelente' : p.condition === 'B' ? 'Grado B — Muy bueno' : 'Grado C — Bueno';
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Etiqueta ${p.product_code || p.id}</title>
<style>
  @page { size: 29mm 42mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 29mm; height: 42mm; overflow: hidden; }
  body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #000; }
  .label { width: 29mm; height: 42mm; padding: 2mm 2mm; display: flex; flex-direction: column; justify-content: space-between; }
  .top { display: flex; flex-direction: column; gap: 0.5mm; }
  .model { font-size: 7pt; font-weight: 700; color: #000; line-height: 1.2; }
  .sub { font-weight: 400; font-size: 5.5pt; color: #333; }
  .code { font-size: 6.5pt; font-weight: 900; color: #000; font-family: monospace; }
  .mid { font-size: 5.5pt; color: #444; line-height: 1.4; }
  .bottom { display: flex; justify-content: space-between; align-items: flex-end; }
  .store { font-size: 4.5pt; color: #777; letter-spacing: 0.3px; text-transform: uppercase; }
  .price { font-size: 10pt; font-weight: 900; color: #000; }
  @media print {
    html, body { width: 29mm; height: 42mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style></head><body>
<div class="label">
  <div class="top">
    <div class="model">${p.model}<br><span class="sub">${[p.capacity, p.color].filter(Boolean).join(' · ')}</span></div>
    <div class="code">${p.product_code || '—'}</div>
  </div>
  <div class="mid">${condLabel}${p.battery_health ? ` · Bat. ${p.battery_health}%` : ''}${p.imei ? ` · IMEI ···${p.imei.slice(-4)}` : ''}</div>
  <div class="bottom">
    <div class="store">iGreen · Los Ríos 1774</div>
    <div class="price">${p.sale_price ? 'USD&nbsp;' + p.sale_price.toLocaleString('es-AR') : '—'}</div>
  </div>
</div>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  }

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
      photos: addForm.photos.length > 0 ? addForm.photos : null,
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
      photos: editForm.photos.length > 0 ? editForm.photos : null,
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
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
        <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setEditForm({ model: prod.model, imei: prod.imei, capacity: prod.capacity, color: prod.color, condition: prod.condition, battery_health: prod.battery_health, cost_price: prod.cost_price?.toString() || "", sale_price: prod.sale_price?.toString() || "", origin: prod.origin || "propio", consignment_owner: prod.consignment_owner || "", defects: prod.defects || "", notes: prod.notes || "", is_new: prod.is_new, photos: prod.photos || [] });
    setShowEditModal(true);
  };

  const mobileContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mobile header */}
      <div className="px-4 pt-4 pb-3 border-b border-white/[0.05] flex items-center gap-2">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 flex-1">
          <span className="material-symbols-outlined text-white/40 text-base">search</span>
          <input className="bg-transparent text-sm text-white/70 placeholder:text-white/35 outline-none w-full" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setAddForm(emptyProductForm); setShowAddModal(true); }}
          className="flex items-center gap-1.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 text-sm font-medium px-3 py-2.5 rounded-xl transition-colors whitespace-nowrap">
          <span className="material-symbols-outlined text-[16px]">add</span>Cargar
        </button>
      </div>
      {/* Mobile filter chips */}
      <div className="px-4 py-2.5 flex gap-2 overflow-x-auto border-b border-white/[0.05]">
        {[
          { val: statusFilter, set: setStatusFilter, opts: [["todos","Todos"],["disponible","Disp."],["reservado","Res."],["vendido","Vend."]] },
          { val: conditionFilter, set: setConditionFilter, opts: [["todos","Cond."],["A","A"],["B","B"],["C","C"]] },
        ].map((group, gi) => (
          <div key={gi} className="flex gap-1.5 shrink-0">
            {group.opts.map(([key, lbl]) => (
              <button key={key} onClick={() => group.set(key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors ${
                  group.val === key
                    ? 'bg-white/[0.10] border border-white/[0.14] text-white/80'
                    : 'text-white/40 hover:text-white/60 bg-white/[0.03]'
                }`}>{lbl}</button>
            ))}
            {gi === 0 && <div className="w-px bg-white/[0.08] mx-1 self-stretch" />}
          </div>
        ))}
      </div>
      {/* KPIs horizontal scroll */}
      <div className="px-4 py-3 flex gap-2.5 overflow-x-auto border-b border-white/[0.04]">
        {[
          { label: "Disp.", value: disponibles.toString(), icon: "inventory_2" },
          { label: "Res.", value: reservados.toString(), icon: "bookmark" },
          { label: "Hoy", value: vendidosHoy.toString(), icon: "sell" },
          { label: "Stock", value: formatPrice(valorStock), icon: "payments" },
        ].map(k => (
          <div key={k.label} className="shrink-0 rounded-[14px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[13px] bg-[#161619] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[15px] text-white/15">{k.icon}</span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/30">{k.label}</p>
                <p className="text-[15px] font-semibold text-white/80 leading-tight">{k.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Cards list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-white/10 text-4xl mb-3">inventory_2</span>
            <p className="text-sm text-white/50">No hay equipos</p>
          </div>
        ) : (
          <>
            {filtered.map(p => (
              <MobileProductCard
                key={p.id}
                p={p}
                onSell={openSaleModal}
                onEdit={openEditModal}
                onLabel={printLabel}
              />
            ))}
            <p className="text-center text-[11px] text-white/30 py-2">{filtered.length} de {allProducts.length} equipos</p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
    {isMobile ? mobileContent : (
    <div className="px-8 py-8 overflow-y-auto flex-1">
    <>
      {/* Top row: Filters left + KPIs right */}
      <div className="flex gap-4 mb-6 items-stretch">

        {/* LEFT — Filters */}
        <div className="w-[280px] shrink-0 rounded-[18px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
          <div className="rounded-[17px] bg-[#161619] h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] divide-y divide-white/[0.04] flex flex-col">
            {[
              { label: "Estado",    opts: [["todos","Todos"],["disponible","Disponible"],["reservado","Reservado"],["vendido","Vendido"]], val: statusFilter, set: setStatusFilter },
              { label: "Tipo",      opts: [["todos","Todos"],["nuevo","Nuevo"],["usado","Usado"]], val: newFilter, set: setNewFilter },
              { label: "Condición", opts: [["todos","Todos"],["A","A"],["B","B"],["C","C"]], val: conditionFilter, set: setConditionFilter },
              { label: "Origen",    opts: [["todos","Todos"],["propio","Propio"],["consignacion","Consignación"]], val: originFilter, set: setOriginFilter },
            ].map(group => (
              <div key={group.label} className="px-4 py-3.5 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30 mb-2.5">{group.label}</p>
                <div className="flex flex-wrap gap-1.5">
                  {group.opts.map(([key, lbl]) => (
                    <button key={key} onClick={() => group.set(key)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        group.val === key
                          ? 'bg-[#3eff8e]/15 text-[#3eff8e] border border-[#3eff8e]/20'
                          : 'text-white/40 hover:text-white/60 hover:bg-white/[0.05]'
                      }`}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — 6 KPI cards 3×2 */}
        <div className="grid grid-cols-3 gap-3 flex-1">
          {[
            { label: "Disponibles", value: disponibles.toString(),  sub: "en stock",   icon: "inventory_2" },
            { label: "Reservados",  value: reservados.toString(),   sub: "con seña",   icon: "bookmark"    },
            { label: "Vendidos hoy",value: vendidosHoy.toString(),  sub: "hoy",        icon: "sell"        },
            { label: "Valor stock", value: formatPrice(valorStock), sub: "disponible", icon: "payments"    },
            { label: "Ganancia mes", value: formatPrice(gananciaMes), sub: monthStr.slice(5) === new Date().toISOString().slice(5,7) ? "este mes" : monthStr, icon: "trending_up" },
          ].map((k) => (
            <div key={k.label} className="rounded-[18px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
              <div className="rounded-[17px] bg-[#161619] px-5 py-4 h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{k.label}</p>
                  <span className="material-symbols-outlined text-[16px] text-white/15">{k.icon}</span>
                </div>
                <div className="mt-3">
                  <p className="text-[28px] font-medium text-white/90 leading-none tracking-tight">{k.value}</p>
                  <p className="text-[11px] text-white/35 mt-1">{k.sub}</p>
                </div>
              </div>
            </div>
          ))}

          {/* Objetivo mensual */}
          <div className="rounded-[18px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[17px] bg-[#161619] px-5 py-4 h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Objetivo mes</p>
                <span className="material-symbols-outlined text-[16px] text-white/15">flag</span>
              </div>
              <div className="mt-3">
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-[28px] font-medium text-white/90 leading-none tracking-tight">{objetivoPct}%</p>
                  <p className="text-[11px] text-white/35">{formatPrice(OBJETIVO_MES)}</p>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-[#3eff8e] transition-all duration-500" style={{ width: `${objetivoPct}%` }} />
                </div>
                <p className="text-[10px] text-white/30 mt-1.5">{formatPrice(gananciaMes)} ganados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar above table */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2.5 flex-1 hover:border-white/[0.1] transition-colors">
          <span className="material-symbols-outlined text-white/40 text-base">search</span>
          <input className="bg-transparent text-sm text-white/70 placeholder:text-white/35 outline-none w-full" placeholder="Buscar por modelo o IMEI…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setAddForm(emptyProductForm); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/80 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
          <span className="material-symbols-outlined text-[16px]">add</span>Cargar
        </button>
        <button onClick={() => { const d = allProducts.find(p => p.status === "disponible"); if (d) openSaleModal(d); else alert("No hay equipos disponibles"); }}
          className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/55 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
          <span className="material-symbols-outlined text-[16px]">point_of_sale</span>Nueva venta
        </button>
        <button onClick={() => {
          const headers = ['Modelo','IMEI','Capacidad','Color','Condición','Batería','Estado','Origen','Costo','Precio','Defectos'];
          const rows = filtered.map(p => [
            p.model, p.imei, p.capacity, p.color, p.condition,
            p.battery_health + '%', p.status,
            p.origin || '', p.cost_price, p.sale_price, p.defects || ''
          ]);
          const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url;
          a.download = `igreen-stock-${new Date().toISOString().slice(0,10)}.csv`;
          a.click(); URL.revokeObjectURL(url);
        }}
          className="flex items-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/55 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap">
          <span className="material-symbols-outlined text-[16px]">download</span>Exportar
        </button>
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
                      {["","Equipo","IMEI","Capacidad","Condición","Batería","Defectos","Días","Precio","Estado",""].map((h,i) => (
                        <th key={i} className={`px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45 ${i > 0 && i < 10 ? 'border-l border-white/[0.04]' : ''}`}>{h}</th>
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
                            <td className="px-4 py-3.5 border-l border-white/[0.04]">
                              <div>
                                <p className="text-sm font-medium text-white/80">{p.model}</p>
                                <p className="text-[10px] text-white/40 font-mono">{p.product_code || '—'}{p.color ? ` · ${p.color}` : ''}{p.is_new ? ' · NUEVO' : ''}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[11px] text-white/55 border-l border-white/[0.04]">••••{p.imei.slice(-4)}</td>
                            <td className="px-4 py-3.5 text-sm text-white/60 border-l border-white/[0.04]">{p.capacity}</td>
                            <td className="px-4 py-3.5 border-l border-white/[0.04]">
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                                p.condition === 'A' ? 'bg-emerald-500/10 text-emerald-400' :
                                p.condition === 'B' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-red-500/10 text-red-400'
                              }`}>Grado {p.condition}</span>
                            </td>
                            <td className="px-4 py-3.5 border-l border-white/[0.04]">
                              <span className={`text-sm font-medium ${p.battery_health > 85 ? 'text-emerald-400' : p.battery_health >= 70 ? 'text-amber-400' : 'text-red-400'}`}>
                                {p.battery_health}%
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-[12px] text-white/40 max-w-[140px] border-l border-white/[0.04]">
                              <span className="line-clamp-1">{p.defects || '—'}</span>
                            </td>
                            <td className="px-4 py-3.5 border-l border-white/[0.04]">
                              {(() => {
                                if (p.status === 'vendido') return <span className="text-sm text-white/25">—</span>;
                                const ref = p.loaded_at || p.created_at;
                                const days = Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
                                const color = days <= 7 ? 'text-emerald-400' : days <= 20 ? 'text-amber-400' : 'text-red-400';
                                return <span className={`text-sm font-medium ${color}`}>{days}d</span>;
                              })()}
                            </td>
                            <td className="px-4 py-3.5 text-sm font-medium text-white/70 border-l border-white/[0.04]">{formatPrice(p.sale_price)}</td>
                            <td className="px-4 py-3.5 border-l border-white/[0.04]">
                              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                                p.status === 'disponible' ? 'bg-white/[0.07] text-white/50' :
                                p.status === 'reservado'  ? 'bg-amber-500/10 text-amber-400' :
                                'bg-white/[0.04] text-white/45'
                              }`}>
                                {p.status === 'disponible' ? 'Disponible' : p.status === 'reservado' ? 'Reservado' : 'Vendido'}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-right border-l border-white/[0.04]">
                              {p.status === 'disponible' && (
                                <button onClick={ev => { ev.stopPropagation(); openSaleModal(p); }}
                                  className="flex items-center gap-1 bg-[#3eff8e]/10 hover:bg-[#3eff8e]/20 text-[#3eff8e] text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
                                  <span className="material-symbols-outlined text-[13px]">sell</span>Vender
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Inline detail row */}
                          {isOpen && (
                            <tr key={`${p.id}-detail`} className="border-b border-white/[0.05] bg-white/[0.02]">

                              {/* Zona 1 — Fotos (alinea con chevron + Equipo) */}
                              <td colSpan={2} className="px-4 py-4 align-top border-r border-white/[0.05]">
                                <div className="grid grid-cols-3 gap-2">
                                  {[...(p.photos || []), null, null, null, null, null, null].slice(0, 6).map((photo, n) => (
                                    <div key={n} className="w-[52px] h-[52px] rounded-lg bg-white/[0.04] border border-white/[0.07] flex items-center justify-center overflow-hidden">
                                      {photo
                                        // eslint-disable-next-line @next/next/no-img-element
                                        ? <img src={photo} alt="" className="w-full h-full object-cover" />
                                        : <span className="material-symbols-outlined text-white/10 text-base">image</span>
                                      }
                                    </div>
                                  ))}
                                </div>
                              </td>

                              {/* Zona 2 — Datos (alinea con IMEI → Días) */}
                              <td colSpan={6} className="px-5 py-4 align-top border-r border-white/[0.05]">
                                <div className="grid grid-cols-4 gap-x-8 gap-y-4">
                                  {[
                                    { l: "IMEI",      v: p.imei, mono: true },
                                    { l: "Capacidad", v: p.capacity },
                                    { l: "Color",     v: p.color },
                                    { l: "Condición", v: `Grado ${p.condition}` },
                                    { l: "Batería",   v: `${p.battery_health}%` },
                                    { l: "Tipo",      v: p.is_new ? 'Nuevo' : 'Usado' },
                                    { l: "Origen",    v: p.origin === 'consignacion' ? `Consig. — ${p.consignment_owner || '?'}` : 'Stock propio' },
                                    ...(p.defects ? [{ l: "Defectos", v: p.defects }] : [{ l: "Defectos", v: '—' }]),
                                  ].map(i => (
                                    <div key={i.l} className="flex flex-col gap-1">
                                      <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/40">{i.l}</span>
                                      <span className={`text-[13px] font-medium text-white/80 leading-tight ${(i as {mono?: boolean}).mono ? 'font-mono text-[11px]' : ''}`}>{i.v}</span>
                                    </div>
                                  ))}
                                </div>
                              </td>

                              {/* Zona 3 — Precios + Acciones (alinea con Precio → Estado → acción) */}
                              <td colSpan={3} className="px-5 py-4 align-top">
                                <div className="flex gap-3 h-full">
                                  {/* Precios */}
                                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2.5 flex-1">
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/35">Costo</span>
                                      <span className="text-[12px] font-medium text-white/55">{formatPrice(p.cost_price)}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                      <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/35">Venta</span>
                                      <span className="text-[13px] font-semibold text-white/80">{formatPrice(p.sale_price)}</span>
                                    </div>
                                    {p.cost_price && p.sale_price && (
                                      <div className="flex justify-between items-baseline pt-2 border-t border-white/[0.05]">
                                        <span className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/35">Ganancia</span>
                                        <span className="text-[13px] font-bold text-emerald-400">{formatPrice(p.sale_price - p.cost_price)}</span>
                                      </div>
                                    )}
                                  </div>
                                  {/* Botones */}
                                  <div className="flex flex-col gap-1.5 justify-center w-[100px]">
                                    <button onClick={(e) => { e.stopPropagation(); openEditModal(p); }}
                                      className="flex items-center justify-center gap-1.5 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white/55 text-xs font-medium rounded-xl transition-colors w-full">
                                      <span className="material-symbols-outlined text-[14px]">edit</span>Editar
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); printLabel(p); }}
                                      className="flex items-center justify-center gap-1.5 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-white/55 text-xs font-medium rounded-xl transition-colors w-full">
                                      <span className="material-symbols-outlined text-[14px]">label</span>Etiqueta
                                    </button>
                                    {p.status !== 'vendido' && !showDeleteConfirm && (
                                      <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                                        className="flex items-center justify-center gap-1.5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium rounded-xl transition-colors w-full">
                                        <span className="material-symbols-outlined text-[14px]">delete</span>Eliminar
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

      {/* Add Modal */}
      {showAddModal && (
        <ProductFormModal title="Cargar Equipo" form={addForm} setForm={setAddForm} onSubmit={handleAddProduct} onClose={() => setShowAddModal(false)} saving={savingAdd} submitLabel="Guardar Equipo" />
      )}
      {/* Edit Modal */}
      {showEditModal && editingProduct && (
        <ProductFormModal title="Editar Equipo" form={editForm} setForm={setEditForm} onSubmit={handleEditProduct} onClose={() => setShowEditModal(false)} saving={savingEdit} submitLabel="Guardar Cambios" />
      )}
    </>
    </div>
    )}

    {/* Shared modals (available in both mobile and desktop) */}
    {showSaleModal && saleProduct && (
      <div className={`fixed inset-0 z-50 flex ${isMobile ? 'items-end' : 'items-center'} justify-center bg-black/60 p-4`} onClick={() => { if (!saleConfirmation) setShowSaleModal(false); }}>
        <div className={`${isMobile ? 'rounded-t-[24px] w-full' : 'rounded-[20px] w-full max-w-md'} p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]`} onClick={e => e.stopPropagation()}>
          <div className={`${isMobile ? 'rounded-t-[23px]' : 'rounded-[19px]'} bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${isMobile ? 'max-h-[85vh] overflow-y-auto' : ''}`}>
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
              /* Sale form — shared between mobile and desktop */
              <>
                <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/80">Registrar Venta</p>
                  <button onClick={() => setShowSaleModal(false)} className="text-white/55 hover:text-white/60"><span className="material-symbols-outlined text-[20px]">close</span></button>
                </div>
                <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
                    <p className="text-sm font-medium text-white/70">{saleProduct.model}</p>
                    <p className="text-[11px] text-white/55 font-mono">{saleProduct.imei}</p>
                    <p className="text-[11px] text-white/55 mt-0.5">{saleProduct.capacity} · {saleProduct.color} · Grado {saleProduct.condition} · Batería {saleProduct.battery_health}%</p>
                  </div>
                  <form id="sale-form" onSubmit={handleRegisterSale} className="space-y-4">
                    <div className="relative">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 block mb-1">
                        {saleForm.client_id ? "✓ Cliente seleccionado" : "Buscar Cliente Existente"}
                      </label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-white/30">search</span>
                        <input type="text" value={clientSearch}
                          onChange={async (e) => {
                            const q = e.target.value;
                            setClientSearch(q);
                            setSaleForm(f => ({...f, client_id: ""}));
                            if (q.length >= 2) {
                              const { data } = await supabase.from("ig_clients").select("id,name,last_name,phone,dni,email").or(`name.ilike.%${q}%,phone.ilike.%${q}%,dni.ilike.%${q}%`).limit(6);
                              setClientResults((data || []) as {id:string;name:string;last_name:string|null;phone:string;dni:string;email:string}[]);
                              setShowClientDropdown(true);
                            } else {
                              setClientResults([]);
                              setShowClientDropdown(false);
                            }
                          }}
                          onFocus={() => clientResults.length > 0 && setShowClientDropdown(true)}
                          placeholder="Nombre, teléfono o DNI..."
                          className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors" />
                      </div>
                      {showClientDropdown && clientResults.length > 0 && (
                        <div className="absolute z-50 mt-1 w-full rounded-xl bg-[#1e1e22] border border-white/[0.1] shadow-xl overflow-hidden">
                          {clientResults.map(c => (
                            <button key={c.id} type="button"
                              onClick={() => {
                                setSaleForm(f => ({...f, client_id: c.id, client_name: c.name || "", client_last_name: c.last_name || "", client_phone: c.phone || "", client_dni: c.dni || "", client_email: c.email || ""}));
                                setClientSearch(c.name || "");
                                setShowClientDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left hover:bg-white/[0.06] transition-colors border-b border-white/[0.04] last:border-0">
                              <p className="text-sm text-white/75">{c.name}</p>
                              <p className="text-[11px] text-white/40">{[c.phone, c.dni].filter(Boolean).join(" · ")}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 block mb-1">Precio (USD)</label>
                      <input type="number" required step="0.01" value={saleForm.sale_price} onChange={e => setSaleForm({...saleForm, sale_price: e.target.value})}
                        className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 block mb-1">Método de Pago</label>
                      <DarkSelect value={saleForm.payment_method} onChange={v => setSaleForm({...saleForm, payment_method: v})}
                        options={[
                          { value: "efectivo", label: "Efectivo" },
                          { value: "transferencia", label: "Transferencia" },
                          { value: "tarjeta_debito", label: "Tarjeta Débito" },
                          { value: "tarjeta_credito", label: "Tarjeta Crédito" },
                          { value: "mixto", label: "Mixto" },
                        ]} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 block mb-1">Nombre</label>
                        <input type="text" value={saleForm.client_name} onChange={e => setSaleForm({...saleForm, client_name: e.target.value})} placeholder="Opcional"
                          className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 block mb-1">Apellido</label>
                        <input type="text" value={saleForm.client_last_name} onChange={e => setSaleForm({...saleForm, client_last_name: e.target.value})} placeholder="Opcional"
                          className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 block mb-1">DNI</label>
                        <input type="text" value={saleForm.client_dni} onChange={e => setSaleForm({...saleForm, client_dni: e.target.value})} placeholder="Opcional"
                          className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors" />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 block mb-1">Teléfono</label>
                        <input type="text" value={saleForm.client_phone} onChange={e => setSaleForm({...saleForm, client_phone: e.target.value})} placeholder="Opcional"
                          className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors" />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50 block mb-1">Email</label>
                        <input type="email" value={saleForm.client_email} onChange={e => setSaleForm({...saleForm, client_email: e.target.value})} placeholder="Opcional"
                          className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors" />
                      </div>
                    </div>
                    <div className="border-t border-white/[0.06] pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Garantía</p>
                          <p className="text-[11px] text-white/35 mt-0.5">90 días incluida</p>
                        </div>
                        <span className="text-[11px] text-[#3eff8e] font-medium">✓ Incluida</span>
                      </div>
                      <button type="button"
                        onClick={() => setSaleForm(f => ({...f, extended_warranty: !f.extended_warranty}))}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${saleForm.extended_warranty ? "bg-[#3eff8e]/10 border-[#3eff8e]/30 text-[#3eff8e]" : "bg-white/[0.03] border-white/[0.08] text-white/50 hover:border-white/[0.15]"}`}>
                        <div className="text-left">
                          <p className="text-sm font-medium">Garantía Extendida</p>
                          <p className="text-[11px] opacity-60 mt-0.5">Precio desde Configuración</p>
                        </div>
                        <span className="material-symbols-outlined text-[20px]">{saleForm.extended_warranty ? "check_circle" : "add_circle"}</span>
                      </button>
                    </div>
                    <div className="flex gap-3 pt-1">
                      <button type="button" onClick={() => setShowSaleModal(false)} className="flex-1 py-2.5 bg-white/[0.04] border border-white/[0.08] text-white/50 text-sm rounded-xl">Cancelar</button>
                      <button type="submit" disabled={savingSale} className="flex-1 py-2.5 bg-white/[0.1] border border-white/[0.12] text-white/80 text-sm font-semibold rounded-xl disabled:opacity-50">
                        {savingSale ? "Registrando…" : "Confirmar"}
                      </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )}
    {showAddModal && (
      <ProductFormModal title="Cargar Equipo" form={addForm} setForm={setAddForm} onSubmit={handleAddProduct} onClose={() => setShowAddModal(false)} saving={savingAdd} submitLabel="Guardar Equipo" />
    )}
    {showEditModal && editingProduct && (
      <ProductFormModal title="Editar Equipo" form={editForm} setForm={setEditForm} onSubmit={handleEditProduct} onClose={() => setShowEditModal(false)} saving={savingEdit} submitLabel="Guardar Cambios" />
    )}
    </>
  );
}
