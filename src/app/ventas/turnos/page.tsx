"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  scheduled_at: string;
  status: string;
  notes: string | null;
  product_id: string | null;
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
    <span className={`px-2.5 py-0.5 ${map[s] || "bg-slate-100 text-slate-600"} text-[10px] font-bold rounded-full whitespace-nowrap`}>
      {labels[s] || s.toUpperCase()}
    </span>
  );
}

const emptyForm = {
  client_name: "",
  client_phone: "",
  scheduled_at: "",
  status: "pendiente",
  notes: "",
  product_id: "",
};

export default function TurnosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ig_appointments").select("*").order("scheduled_at", { ascending: true });
    setAppointments((data || []) as Appointment[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = appointments.filter((a) => {
    if (statusFilter !== "todos" && a.status !== statusFilter) return false;
    if (dateFilter && !a.scheduled_at.startsWith(dateFilter)) return false;
    return true;
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      client_name: form.client_name,
      client_phone: form.client_phone,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      status: form.status,
      notes: form.notes || null,
      product_id: form.product_id || null,
    };
    const { error } = await supabase.from("ig_appointments").insert(payload);
    if (!error) {
      setShowAddModal(false);
      setForm(emptyForm);
      await fetchData();
    } else {
      alert("Error: " + error.message);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-sm text-cool-grey">Cargando turnos...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Turnos</h2>
          <p className="text-on-surface-variant text-sm mt-1">Agenda de citas para venta de equipos</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowAddModal(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm shadow-md shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">add</span> Nuevo Turno
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Estado</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
            <option value="todos">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="confirmado">Confirmado</option>
            <option value="completado">Completado</option>
            <option value="no_show">No Show</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Fecha</label>
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
          {dateFilter && (
            <button onClick={() => setDateFilter("")} className="text-xs text-primary font-bold hover:underline">Limpiar</button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-cool-grey">
            <span className="material-symbols-outlined text-4xl mb-3">calendar_month</span>
            <p className="text-sm font-medium">No hay turnos para mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Fecha / Hora</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Cliente</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Teléfono</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Estado</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((a) => {
                  const d = new Date(a.scheduled_at);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold">{d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        <p className="text-[10px] text-cool-grey">{d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium">{a.client_name}</td>
                      <td className="px-4 py-4 text-sm text-on-surface-variant">{a.client_phone}</td>
                      <td className="px-4 py-4">{appointmentStatusBadge(a.status)}</td>
                      <td className="px-4 py-4 text-xs text-on-surface-variant max-w-[200px] truncate">{a.notes || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 bg-slate-50 text-xs font-medium text-cool-grey border-t border-slate-100">
          {filtered.length} turno{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">Nuevo Turno</h3>
              <button onClick={() => setShowAddModal(false)} className="text-cool-grey hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Nombre del Cliente *</label>
                <input required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Teléfono *</label>
                <input required value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                  placeholder="+54 11 ..." />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Fecha y Hora *</label>
                <input type="datetime-local" required value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Estado</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30">
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 resize-none"
                  rows={2} placeholder="Detalles del turno..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-200 rounded-full text-sm font-bold hover:bg-slate-300 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-primary text-white rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:brightness-95 transition-all disabled:opacity-50">
                  {saving ? "Guardando..." : "Crear Turno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
