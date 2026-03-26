"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

/* ───── types ───── */
interface Expense {
  id: string;
  category: string | null;
  description: string | null;
  amount: number;
  date: string;
  recurring: boolean;
  recurring_period: string | null;
  scope: string | null;
  created_at: string;
}

/* ───── constants ───── */
const CATEGORIES = [
  "Publicidad", "Sistema / Hosting", "Compra de stock",
  "Accesorios / Insumos", "Comisiones", "Servicios",
  "Alquiler", "Sueldos", "Transporte", "Otro",
];

const SCOPE_LABELS: Record<string, string> = { ventas: "Ventas", local: "Local", otro: "Otro" };
const SCOPE_COLORS: Record<string, string> = {
  ventas: "bg-emerald-500/15 text-emerald-400",
  local:  "bg-blue-500/15 text-blue-400",
  otro:   "bg-white/[0.08] text-white/40",
};
const RECURRING_LABELS: Record<string, string> = {
  monthly: "Mensual", weekly: "Semanal", yearly: "Anual",
};

const emptyForm = {
  category: "Otro", description: "", amount: "",
  date: new Date().toISOString().split("T")[0],
  recurring: false, recurring_period: "monthly", scope: "ventas",
};

type DateFilter = "todos" | "mes" | "trimestre" | "año";
type ScopeFilter = "todos" | "ventas" | "local" | "otro";

/* ───── helpers ───── */
function fmt(n: number | null) {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("es-AR");
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/* ───── GlassCard (igual que Resumen) ───── */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] transition-all ${className}`}>
      <div className="rounded-[19px] bg-[#161619] h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_32px_-8px_rgba(0,0,0,0.6)]">
        {children}
      </div>
    </div>
  );
}

/* ───── main ───── */
export default function GastosPage() {
  const [expenses, setExpenses]         = useState<Expense[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [scopeFilter, setScopeFilter]   = useState<ScopeFilter>("todos");
  const [dateFilter, setDateFilter]     = useState<DateFilter>("mes");
  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState({ ...emptyForm });
  const [saving, setSaving]             = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabase.from("ig_expenses").select("*").order("date", { ascending: false });
      setExpenses(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      const d = new Date(e.date + "T12:00:00");
      if (dateFilter === "mes" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
      if (dateFilter === "trimestre") {
        const q = Math.floor(now.getMonth() / 3);
        if (Math.floor(d.getMonth() / 3) !== q || d.getFullYear() !== now.getFullYear()) return false;
      }
      if (dateFilter === "año" && d.getFullYear() !== now.getFullYear()) return false;
      if (scopeFilter !== "todos" && e.scope !== scopeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.description?.toLowerCase().includes(q) || e.category?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [expenses, search, scopeFilter, dateFilter]);

  const totalFiltered  = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const recurringTotal = filtered.filter(e => e.recurring).reduce((s, e) => s + Number(e.amount), 0);
  const oneOffTotal    = filtered.filter(e => !e.recurring).reduce((s, e) => s + Number(e.amount), 0);
  const ventasTotal    = filtered.filter(e => e.scope === "ventas").reduce((s, e) => s + Number(e.amount), 0);

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => { const c = e.category || "Otro"; map[c] = (map[c] || 0) + Number(e.amount); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filtered]);

  async function handleSave() {
    if (!form.amount || !form.date) return;
    setSaving(true);
    try {
      const payload = {
        category: form.category,
        description: form.description || null,
        amount: parseFloat(form.amount),
        date: form.date,
        recurring: form.recurring,
        recurring_period: form.recurring ? form.recurring_period : null,
        scope: form.scope,
      };
      if (editId) await supabase.from("ig_expenses").update(payload).eq("id", editId);
      else        await supabase.from("ig_expenses").insert(payload);
      setShowForm(false); setEditId(null); setForm({ ...emptyForm }); fetchData();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await supabase.from("ig_expenses").delete().eq("id", id);
    setDeleteConfirm(null); setExpandedId(null); fetchData();
  }

  function openEdit(e: Expense) {
    setForm({ category: e.category || "Otro", description: e.description || "", amount: String(e.amount),
      date: e.date, recurring: e.recurring, recurring_period: e.recurring_period || "monthly", scope: e.scope || "ventas" });
    setEditId(e.id); setShowForm(true); setExpandedId(null);
  }

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
      <div className="w-4 h-4 rounded-full border border-white/20 border-t-white/60 animate-spin" />
    </div>
  );

  const periodLabel = dateFilter === "mes" ? "este mes" : dateFilter === "trimestre" ? "este trimestre" : dateFilter === "año" ? "este año" : "total";

  const kpiCards = [
    { label: "Total egresos",  value: fmt(totalFiltered),  sub: periodLabel,    accent: true  },
    { label: "Scope ventas",   value: fmt(ventasTotal),    sub: "ventas",       accent: false },
    { label: "Recurrentes",    value: fmt(recurringTotal), sub: "fijos",        accent: false },
    { label: "Puntuales",      value: fmt(oneOffTotal),    sub: "variables",    accent: false },
  ];

  return (<>
    <div className="px-8 py-8 overflow-y-auto flex-1">
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[11px] text-white/50 uppercase tracking-[0.14em] mb-2">
            {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="text-[28px] font-medium text-white/90 leading-none tracking-tight">Gastos</h1>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }); }}
          className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-white/70 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          Nuevo gasto
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map(k => (
          <GlassCard key={k.label} className={k.accent ? "ring-1 ring-red-400/20" : ""}>
            <div className="p-5">
              <p className="text-[11px] font-normal text-white/50 uppercase tracking-[0.14em] mb-4">{k.label}</p>
              <p className={`font-medium leading-none tracking-tight ${k.accent ? "text-[32px] text-red-400" : "text-[26px] text-white/90"}`}>{k.value}</p>
              {k.accent && <div className="w-6 h-px bg-red-400/40 mt-3 mb-1" />}
              <p className="text-[11px] text-white/45 mt-1.5">{k.sub}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Main card */}
      <GlassCard>
        <div className="p-5">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4 mb-5">
            <p className="text-[11px] font-normal text-white/50 uppercase tracking-[0.14em] flex-1">Egresos operativos</p>
            {/* Date chips */}
            <div className="flex gap-1">
              {(["mes", "trimestre", "año", "todos"] as DateFilter[]).map(f => (
                <button key={f} onClick={() => setDateFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${dateFilter === f ? "bg-white/[0.10] text-white/80 border border-white/[0.12]" : "text-white/40 hover:text-white/60"}`}>
                  {f === "mes" ? "Este mes" : f === "trimestre" ? "Trimestre" : f === "año" ? "Este año" : "Todos"}
                </button>
              ))}
            </div>
            {/* Scope chips */}
            <div className="flex gap-1">
              {(["todos", "ventas", "local", "otro"] as ScopeFilter[]).map(f => (
                <button key={f} onClick={() => setScopeFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${scopeFilter === f ? "bg-white/[0.10] text-white/80 border border-white/[0.12]" : "text-white/40 hover:text-white/60"}`}>
                  {f === "todos" ? "Todos" : SCOPE_LABELS[f]}
                </button>
              ))}
            </div>
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-white/25">search</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
                className="pl-8 pr-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded-xl text-[12px] text-white/70 placeholder-white/25 outline-none focus:border-white/20 w-40" />
            </div>
          </div>

          {/* Top categorías */}
          {byCategory.length > 0 && (
            <div className="flex items-center gap-5 pb-4 mb-1 border-b border-white/[0.04] overflow-x-auto">
              <span className="text-[10px] uppercase tracking-widest text-white/25 whitespace-nowrap shrink-0">Top categorías</span>
              {byCategory.map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-[12px] text-white/55">{cat}</span>
                  <span className="text-[12px] text-red-400/70 font-medium">{fmt(amt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-white/45">Sin gastos para el período seleccionado</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="py-3 text-left text-[10px] font-normal text-white/40 uppercase tracking-[0.14em]">Fecha</th>
                  <th className="py-3 text-left text-[10px] font-normal text-white/40 uppercase tracking-[0.14em]">Categoría</th>
                  <th className="py-3 text-left text-[10px] font-normal text-white/40 uppercase tracking-[0.14em]">Descripción</th>
                  <th className="py-3 text-left text-[10px] font-normal text-white/40 uppercase tracking-[0.14em]">Scope</th>
                  <th className="py-3 text-left text-[10px] font-normal text-white/40 uppercase tracking-[0.14em] hidden lg:table-cell">Recurrente</th>
                  <th className="py-3 text-right text-[10px] font-normal text-white/40 uppercase tracking-[0.14em]">Monto</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <React.Fragment key={e.id}>
                    <tr onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                      className="border-t border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer">
                      <td className="py-3 text-sm text-white/45 whitespace-nowrap">{fmtDate(e.date)}</td>
                      <td className="py-3 text-sm text-white/70 font-medium">{e.category || "—"}</td>
                      <td className="py-3 text-sm text-white/45 max-w-xs truncate">{e.description || <span className="italic text-white/20">Sin descripción</span>}</td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${SCOPE_COLORS[e.scope || "otro"]}`}>
                          {SCOPE_LABELS[e.scope || "otro"] || e.scope}
                        </span>
                      </td>
                      <td className="py-3 hidden lg:table-cell">
                        {e.recurring
                          ? <span className="text-[11px] text-blue-400/70">{RECURRING_LABELS[e.recurring_period || ""] || "Recurrente"}</span>
                          : <span className="text-[11px] text-white/20">Puntual</span>}
                      </td>
                      <td className="py-3 text-right text-sm font-semibold text-red-400">{fmt(e.amount)}</td>
                    </tr>

                    {expandedId === e.id && (
                      <tr className="border-t border-white/[0.04]">
                        <td colSpan={6} className="bg-white/[0.015] px-0 py-4">
                          <div className="flex items-start justify-between gap-6">
                            <div className="grid grid-cols-3 gap-x-10 gap-y-3 flex-1">
                              {[
                                { label: "Monto",       value: <span className="text-red-400 font-semibold text-[15px]">{fmt(e.amount)}</span> },
                                { label: "Categoría",   value: e.category || "—" },
                                { label: "Scope",       value: SCOPE_LABELS[e.scope || "otro"] || e.scope || "—" },
                                { label: "Fecha",       value: fmtDate(e.date) },
                                { label: "Recurrente",  value: e.recurring ? (RECURRING_LABELS[e.recurring_period || ""] || "Sí") : "No" },
                                { label: "Descripción", value: e.description || <span className="italic text-white/25">Sin descripción</span> },
                              ].map((c, i) => (
                                <div key={i}>
                                  <p className="text-[9px] uppercase tracking-[0.14em] font-normal text-white/35 mb-0.5">{c.label}</p>
                                  <p className="text-[13px] text-white/70">{c.value}</p>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2 pt-1 pr-1">
                              <button onClick={ev => { ev.stopPropagation(); openEdit(e); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-xl text-[11px] text-white/55 transition-colors">
                                <span className="material-symbols-outlined text-[13px]">edit</span>Editar
                              </button>
                              {deleteConfirm === e.id ? (
                                <div className="flex gap-1.5">
                                  <button onClick={ev => { ev.stopPropagation(); handleDelete(e.id); }}
                                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-[11px] text-red-400 transition-colors">Confirmar</button>
                                  <button onClick={ev => { ev.stopPropagation(); setDeleteConfirm(null); }}
                                    className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl text-[11px] text-white/40 transition-colors">Cancelar</button>
                                </div>
                              ) : (
                                <button onClick={ev => { ev.stopPropagation(); setDeleteConfirm(e.id); }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/18 border border-red-500/20 rounded-xl text-[11px] text-red-400/60 transition-colors">
                                  <span className="material-symbols-outlined text-[13px]">delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}

          {filtered.length > 0 && (
            <div className="flex justify-between items-center pt-4 mt-1 border-t border-white/[0.04]">
              <span className="text-[11px] text-white/30">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
              <span className="text-sm font-semibold text-red-400">{fmt(totalFiltered)}</span>
            </div>
          )}
        </div>
      </GlassCard>

    </div>
    </div>

    {showForm && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-[#161619] border border-white/[0.1] rounded-2xl w-full max-w-md shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
            <h2 className="text-sm font-medium text-white/80">{editId ? "Editar gasto" : "Nuevo gasto"}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-white/30 hover:text-white/60">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="p-5 space-y-4">

            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] font-normal text-white/40 block mb-1.5">Monto *</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.09] rounded-xl text-[15px] font-medium text-white/90 placeholder-white/20 outline-none focus:border-white/20" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] font-normal text-white/40 block mb-1.5">Categoría</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.09] rounded-xl text-[13px] text-white/75 outline-none focus:border-white/20">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] font-normal text-white/40 block mb-1.5">Scope</label>
                <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.09] rounded-xl text-[13px] text-white/75 outline-none focus:border-white/20">
                  <option value="ventas">Ventas</option>
                  <option value="local">Local</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] font-normal text-white/40 block mb-1.5">Descripción</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ej: Meta Ads marzo, Vercel Pro..."
                className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.09] rounded-xl text-[13px] text-white/75 placeholder-white/20 outline-none focus:border-white/20" />
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.14em] font-normal text-white/40 block mb-1.5">Fecha *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.09] rounded-xl text-[13px] text-white/75 outline-none focus:border-white/20" />
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setForm(f => ({ ...f, recurring: !f.recurring }))}
                className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${form.recurring ? "bg-blue-500" : "bg-white/[0.10]"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${form.recurring ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-[12px] text-white/50">Gasto recurrente</span>
              {form.recurring && (
                <select value={form.recurring_period} onChange={e => setForm(f => ({ ...f, recurring_period: e.target.value }))}
                  className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.09] rounded-xl text-[12px] text-white/65 outline-none">
                  <option value="monthly">Mensual</option>
                  <option value="weekly">Semanal</option>
                  <option value="yearly">Anual</option>
                </select>
              )}
            </div>
          </div>
          <div className="flex gap-3 px-5 pb-5">
            <button onClick={() => { setShowForm(false); setEditId(null); }}
              className="flex-1 py-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl text-[13px] text-white/45 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !form.amount || !form.date}
              className="flex-1 py-2.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] rounded-xl text-[13px] font-medium text-white/80 transition-colors disabled:opacity-40">
              {saving ? "Guardando..." : editId ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    )}
  </>);
}
