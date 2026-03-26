"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

const CATEGORIES = [
  "Publicidad",
  "Sistema / Hosting",
  "Compra de stock",
  "Accesorios / Insumos",
  "Comisiones",
  "Servicios",
  "Alquiler",
  "Sueldos",
  "Transporte",
  "Otro",
];

const SCOPES = ["ventas", "local", "otro"] as const;
const SCOPE_LABELS: Record<string, string> = {
  ventas: "Ventas",
  local: "Local",
  otro: "Otro",
};
const SCOPE_COLORS: Record<string, string> = {
  ventas: "bg-emerald-500/15 text-emerald-400",
  local: "bg-blue-500/15 text-blue-400",
  otro: "bg-white/[0.08] text-white/40",
};

const RECURRING_LABELS: Record<string, string> = {
  monthly: "Mensual",
  weekly: "Semanal",
  yearly: "Anual",
};

const emptyForm = {
  category: "Otro",
  description: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  recurring: false,
  recurring_period: "monthly",
  scope: "ventas",
};

type ScopeFilter = "todos" | "ventas" | "local" | "otro";
type DateFilter = "todos" | "mes" | "trimestre" | "año";

/* ───── helpers ───── */
function formatMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return "$" + Math.round(n).toLocaleString("es-AR");
}
function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("es-AR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

/* ───── main ───── */
export default function GastosPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("todos");
  const [dateFilter, setDateFilter] = useState<DateFilter>("mes");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("ig_expenses")
        .select("*")
        .order("date", { ascending: false });
      setExpenses(data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    const now = new Date();
    return expenses.filter(e => {
      // date filter
      if (dateFilter !== "todos") {
        const d = new Date(e.date + "T12:00:00");
        if (dateFilter === "mes" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
        if (dateFilter === "trimestre") {
          const q = Math.floor(now.getMonth() / 3);
          if (Math.floor(d.getMonth() / 3) !== q || d.getFullYear() !== now.getFullYear()) return false;
        }
        if (dateFilter === "año" && d.getFullYear() !== now.getFullYear()) return false;
      }
      // scope filter
      if (scopeFilter !== "todos" && e.scope !== scopeFilter) return false;
      // search
      if (search) {
        const q = search.toLowerCase();
        return (
          e.description?.toLowerCase().includes(q) ||
          e.category?.toLowerCase().includes(q) ||
          String(e.amount).includes(q)
        );
      }
      return true;
    });
  }, [expenses, search, scopeFilter, dateFilter]);

  // KPIs
  const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const recurringTotal = filtered.filter(e => e.recurring).reduce((s, e) => s + Number(e.amount), 0);
  const oneOffTotal = filtered.filter(e => !e.recurring).reduce((s, e) => s + Number(e.amount), 0);
  const ventasTotal = filtered.filter(e => e.scope === "ventas").reduce((s, e) => s + Number(e.amount), 0);

  // by category (top 5)
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => {
      const cat = e.category || "Otro";
      map[cat] = (map[cat] || 0) + Number(e.amount);
    });
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
      if (editId) {
        await supabase.from("ig_expenses").update(payload).eq("id", editId);
      } else {
        await supabase.from("ig_expenses").insert(payload);
      }
      setShowForm(false);
      setEditId(null);
      setForm({ ...emptyForm });
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await supabase.from("ig_expenses").delete().eq("id", id);
    setDeleteConfirm(null);
    setExpandedId(null);
    fetchData();
  }

  function openEdit(e: Expense) {
    setForm({
      category: e.category || "Otro",
      description: e.description || "",
      amount: String(e.amount),
      date: e.date,
      recurring: e.recurring,
      recurring_period: e.recurring_period || "monthly",
      scope: e.scope || "ventas",
    });
    setEditId(e.id);
    setShowForm(true);
    setExpandedId(null);
  }

  if (loading) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl text-white/20 animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white/90">Gastos</h1>
          <p className="text-[12px] text-white/35 mt-0.5">Egresos operativos del negocio</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm({ ...emptyForm }); }}
          className="flex items-center gap-2 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] rounded-xl text-[13px] font-bold text-white/80 transition-all"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Nuevo gasto
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: dateFilter === "mes" ? "Total este mes" : dateFilter === "trimestre" ? "Total trimestre" : dateFilter === "año" ? "Total este año" : "Total", value: formatMoney(totalFiltered), icon: "payments", color: "text-red-400" },
          { label: "Ventas (scope)", value: formatMoney(ventasTotal), icon: "storefront", color: "text-emerald-400" },
          { label: "Recurrentes", value: formatMoney(recurringTotal), icon: "autorenew", color: "text-blue-400" },
          { label: "Puntuales", value: formatMoney(oneOffTotal), icon: "receipt_long", color: "text-white/60" },
        ].map((k, i) => (
          <div key={i} className="rounded-[18px] p-[1px]" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}>
            <div className="rounded-[17px] bg-[#161619] px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`material-symbols-outlined text-[16px] ${k.color}`}>{k.icon}</span>
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">{k.label}</span>
              </div>
              <p className={`text-[22px] font-bold ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main card */}
      <div className="rounded-[18px] p-[1px]" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)" }}>
        <div className="rounded-[17px] bg-[#161619] overflow-hidden">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-white/[0.06]">
            <div className="relative flex-1 min-w-48">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-white/25">search</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar gasto..."
                className="w-full pl-9 pr-3 py-2 bg-white/[0.05] border border-white/[0.08] rounded-xl text-[13px] text-white/80 placeholder-white/25 outline-none focus:border-white/20"
              />
            </div>
            {/* Date chips */}
            <div className="flex gap-1.5">
              {(["todos", "mes", "trimestre", "año"] as DateFilter[]).map(f => (
                <button key={f} onClick={() => setDateFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${dateFilter === f ? "bg-white/[0.12] text-white/90 border border-white/[0.15]" : "text-white/40 hover:text-white/60"}`}>
                  {f === "todos" ? "Todos" : f === "mes" ? "Este mes" : f === "trimestre" ? "Trimestre" : "Este año"}
                </button>
              ))}
            </div>
            {/* Scope chips */}
            <div className="flex gap-1.5">
              {(["todos", "ventas", "local", "otro"] as ScopeFilter[]).map(f => (
                <button key={f} onClick={() => setScopeFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${scopeFilter === f ? "bg-white/[0.12] text-white/90 border border-white/[0.15]" : "text-white/40 hover:text-white/60"}`}>
                  {f === "todos" ? "Todos" : SCOPE_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Top categories bar */}
          {byCategory.length > 0 && (
            <div className="flex items-center gap-4 px-5 py-3 border-b border-white/[0.04] overflow-x-auto">
              <span className="text-[10px] uppercase tracking-widest text-white/25 whitespace-nowrap">Top categorías</span>
              {byCategory.map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="text-[11px] font-bold text-white/55">{cat}</span>
                  <span className="text-[11px] text-red-400/80">{formatMoney(amt)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-3.5 text-left text-[10px] uppercase tracking-widest font-bold text-white/35">Fecha</th>
                <th className="px-4 py-3.5 text-left text-[10px] uppercase tracking-widest font-bold text-white/35">Categoría</th>
                <th className="px-4 py-3.5 text-left text-[10px] uppercase tracking-widest font-bold text-white/35">Descripción</th>
                <th className="px-4 py-3.5 text-left text-[10px] uppercase tracking-widest font-bold text-white/35">Scope</th>
                <th className="px-4 py-3.5 text-left text-[10px] uppercase tracking-widest font-bold text-white/35 hidden lg:table-cell">Recurrente</th>
                <th className="px-5 py-3.5 text-right text-[10px] uppercase tracking-widest font-bold text-white/35">Monto</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-white/20 text-[13px]">No hay gastos registrados</td></tr>
              ) : filtered.map(e => (
                <>
                  <tr
                    key={e.id}
                    onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                    className="border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3.5 text-[12px] text-white/50 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px] font-medium text-white/75">{e.category || "—"}</span>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] text-white/45 max-w-xs truncate">{e.description || <span className="italic text-white/20">Sin descripción</span>}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${SCOPE_COLORS[e.scope || "otro"]}`}>
                        {SCOPE_LABELS[e.scope || "otro"] || e.scope}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      {e.recurring ? (
                        <span className="flex items-center gap-1 text-[11px] text-blue-400">
                          <span className="material-symbols-outlined text-[13px]">autorenew</span>
                          {RECURRING_LABELS[e.recurring_period || ""] || e.recurring_period || "Recurrente"}
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/20">Puntual</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-[14px] font-bold text-red-400">{formatMoney(e.amount)}</span>
                    </td>
                  </tr>

                  {expandedId === e.id && (
                    <tr key={e.id + "-detail"} className="border-b border-white/[0.05]">
                      <td colSpan={6} className="bg-white/[0.02] px-6 py-4">
                        <div className="flex items-start justify-between gap-6">
                          <div className="grid grid-cols-3 gap-x-10 gap-y-3 flex-1">
                            {[
                              { label: "Monto", value: <span className="text-red-400 font-bold text-[15px]">{formatMoney(e.amount)}</span> },
                              { label: "Categoría", value: e.category || "—" },
                              { label: "Scope", value: SCOPE_LABELS[e.scope || "otro"] || e.scope || "—" },
                              { label: "Fecha", value: formatDate(e.date) },
                              { label: "Recurrente", value: e.recurring ? (RECURRING_LABELS[e.recurring_period || ""] || "Sí") : "No" },
                              { label: "Descripción", value: e.description || <span className="italic text-white/25">Sin descripción</span> },
                            ].map((c, i) => (
                              <div key={i}>
                                <p className="text-[9px] uppercase tracking-[0.12em] font-semibold text-white/30 mb-0.5">{c.label}</p>
                                <p className="text-[13px] font-medium text-white/75">{c.value}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={e2 => { e2.stopPropagation(); openEdit(e); }}
                              className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-xl text-[11px] font-bold text-white/60 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[13px]">edit</span>Editar
                            </button>
                            {deleteConfirm === e.id ? (
                              <div className="flex gap-1.5">
                                <button onClick={ev => { ev.stopPropagation(); handleDelete(e.id); }}
                                  className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl text-[11px] font-bold text-red-400 transition-colors">
                                  Confirmar
                                </button>
                                <button onClick={ev => { ev.stopPropagation(); setDeleteConfirm(null); }}
                                  className="px-3 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-[11px] font-bold text-white/40 transition-colors">
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={ev => { ev.stopPropagation(); setDeleteConfirm(e.id); }}
                                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-[11px] font-bold text-red-400/70 transition-colors"
                              >
                                <span className="material-symbols-outlined text-[13px]">delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <div className="flex justify-between items-center px-5 py-3 border-t border-white/[0.06]">
              <span className="text-[11px] text-white/25">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
              <span className="text-[13px] font-bold text-red-400">{formatMoney(totalFiltered)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal nuevo/editar gasto */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#161619] border border-white/[0.1] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <h2 className="text-[14px] font-bold text-white/85">{editId ? "Editar gasto" : "Nuevo gasto"}</h2>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-white/30 hover:text-white/60">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">

              {/* Monto */}
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/35 block mb-1.5">Monto *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-[14px] font-bold text-white/90 placeholder-white/20 outline-none focus:border-white/25"
                />
              </div>

              {/* Categoría + Scope */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/35 block mb-1.5">Categoría</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-[13px] text-white/80 outline-none focus:border-white/25"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold text-white/35 block mb-1.5">Scope</label>
                  <select
                    value={form.scope}
                    onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-[13px] text-white/80 outline-none focus:border-white/25"
                  >
                    {SCOPES.map(s => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/35 block mb-1.5">Descripción</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ej: Meta Ads marzo, Vercel Pro..."
                  className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-[13px] text-white/80 placeholder-white/20 outline-none focus:border-white/25"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/35 block mb-1.5">Fecha *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-[13px] text-white/80 outline-none focus:border-white/25"
                />
              </div>

              {/* Recurrente */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm(f => ({ ...f, recurring: !f.recurring }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.recurring ? "bg-blue-500" : "bg-white/[0.1]"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${form.recurring ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <span className="text-[12px] text-white/60">Gasto recurrente</span>
                {form.recurring && (
                  <select
                    value={form.recurring_period}
                    onChange={e => setForm(f => ({ ...f, recurring_period: e.target.value }))}
                    className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-[12px] text-white/70 outline-none"
                  >
                    <option value="monthly">Mensual</option>
                    <option value="weekly">Semanal</option>
                    <option value="yearly">Anual</option>
                  </select>
                )}
              </div>

            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => { setShowForm(false); setEditId(null); }}
                className="flex-1 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-[13px] font-bold text-white/50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.amount || !form.date}
                className="flex-1 py-2.5 bg-white/[0.1] hover:bg-white/[0.15] border border-white/[0.15] rounded-xl text-[13px] font-bold text-white/85 transition-colors disabled:opacity-40"
              >
                {saving ? "Guardando..." : editId ? "Actualizar" : "Guardar gasto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
