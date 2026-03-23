"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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

type ViewMode = "lista" | "calendario" | "kanban";

const STATUS_COLORS: Record<string, string> = {
  confirmado: "bg-green-100 text-green-700",
  pendiente: "bg-amber-100 text-amber-700",
  completado: "bg-blue-100 text-blue-700",
  no_show: "bg-red-100 text-red-700",
  cancelado: "bg-slate-200 text-slate-600",
};

const STATUS_LABELS: Record<string, string> = {
  confirmado: "CONFIRMADO",
  pendiente: "PENDIENTE",
  completado: "COMPLETADO",
  no_show: "NO SHOW",
  cancelado: "CANCELADO",
};

const STATUS_BORDER_COLORS: Record<string, string> = {
  pendiente: "border-l-amber-400",
  confirmado: "border-l-green-400",
  completado: "border-l-blue-400",
  no_show: "border-l-red-400",
  cancelado: "border-l-slate-400",
};

const STATUS_DOT_COLORS: Record<string, string> = {
  confirmado: "bg-green-400",
  pendiente: "bg-amber-400",
  completado: "bg-blue-400",
  no_show: "bg-red-400",
  cancelado: "bg-slate-400",
};

const KANBAN_COLUMNS = ["pendiente", "confirmado", "completado", "no_show", "cancelado"] as const;

function appointmentStatusBadge(s: string) {
  return (
    <span className={`px-2.5 py-0.5 ${STATUS_COLORS[s] || "bg-slate-100 text-slate-600"} text-[10px] font-bold rounded-full whitespace-nowrap`}>
      {STATUS_LABELS[s] || s.toUpperCase()}
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

/* ── Calendar helpers ── */
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/* ── Calendar View ── */
function CalendarView({ appointments, onDayClick }: { appointments: Appointment[]; onDayClick?: (date: string) => void }) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const [selectedDay, setSelectedDay] = useState<string>(todayISO);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);
  const prevMonthDays = getDaysInMonth(calYear, calMonth - 1);

  const byDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const key = a.scheduled_at.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(a);
    }
    return map;
  }, [appointments]);

  function prevMonth() {
    if (calMonth === 0) { setCalYear(calYear - 1); setCalMonth(11); }
    else setCalMonth(calMonth - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(calYear + 1); setCalMonth(0); }
    else setCalMonth(calMonth + 1);
  }

  const cells: { day: number; inMonth: boolean; dateStr: string; isWeekend: boolean }[] = [];
  for (let i = 0; i < firstDay; i++) {
    const d = prevMonthDays - firstDay + 1 + i;
    const m = calMonth === 0 ? 12 : calMonth;
    const y = calMonth === 0 ? calYear - 1 : calYear;
    const colIdx = i % 7;
    cells.push({ day: d, inMonth: false, dateStr: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isWeekend: colIdx >= 5 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const colIdx = (firstDay + d - 1) % 7;
    cells.push({ day: d, inMonth: true, dateStr: `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isWeekend: colIdx >= 5 });
  }
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m = calMonth === 11 ? 1 : calMonth + 2;
      const y = calMonth === 11 ? calYear + 1 : calYear;
      const colIdx = (cells.length) % 7;
      cells.push({ day: d, inMonth: false, dateStr: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`, isWeekend: colIdx >= 5 });
    }
  }

  const selectedAppts = byDate[selectedDay] || [];
  const selectedDate = new Date(selectedDay + "T12:00:00");
  const selectedLabel = selectedDay === todayISO ? "Hoy" : selectedDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  function handleDayClick(dateStr: string) {
    setSelectedDay(dateStr);
    if (onDayClick) onDayClick(dateStr);
  }

  return (
    <div className="grid grid-cols-12 gap-5">
      {/* Calendario — izquierda */}
      <div className="col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Nav header */}
        <div className="flex items-center justify-between px-6 py-4">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-lg text-slate-500">chevron_left</span>
          </button>
          <h3 className="text-base font-bold tracking-tight">{MONTH_NAMES[calMonth]} {calYear}</h3>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <span className="material-symbols-outlined text-lg text-slate-500">chevron_right</span>
          </button>
        </div>
        {/* Day names */}
        <div className="grid grid-cols-7 px-2">
          {DAY_NAMES.map((d, i) => (
            <div key={d} className={`py-2 text-center text-[10px] font-semibold uppercase tracking-wider ${i >= 5 ? "text-slate-300" : "text-slate-400"}`}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 px-2 pb-2">
          {cells.map((cell, idx) => {
            const isToday = cell.dateStr === todayISO;
            const isSelected = cell.dateStr === selectedDay && cell.inMonth;
            const dayAppts = byDate[cell.dateStr] || [];
            const hasAppts = dayAppts.length > 0;
            return (
              <div
                key={idx}
                onClick={() => cell.inMonth && handleDayClick(cell.dateStr)}
                className={`min-h-[72px] m-0.5 p-2 rounded-xl transition-all ${
                  cell.inMonth ? "cursor-pointer hover:bg-slate-50" : ""
                } ${cell.isWeekend && cell.inMonth ? "bg-slate-50/40" : ""
                } ${isSelected && !isToday ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}
              >
                <div className="flex items-center gap-1">
                  {isToday ? (
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full bg-primary text-white text-xs font-bold ${isSelected ? "ring-2 ring-primary/30 ring-offset-1" : ""}`}>
                      {cell.day}
                    </span>
                  ) : (
                    <span className={`text-sm font-semibold pl-1 ${cell.inMonth ? "text-slate-700" : "text-slate-200"}`}>
                      {cell.day}
                    </span>
                  )}
                  {hasAppts && (
                    <div className="flex gap-0.5 ml-auto">
                      {dayAppts.slice(0, 4).map((a) => (
                        <span key={a.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[a.status] || "bg-slate-300"}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalle del día — derecha */}
      <div className="col-span-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden sticky top-4">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold capitalize">{selectedLabel}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {selectedAppts.length} turno{selectedAppts.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Turnos del día */}
          <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
            {selectedAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-3xl mb-2">event_available</span>
                <p className="text-xs font-medium">Sin turnos este día</p>
              </div>
            ) : (
              selectedAppts.map((a) => {
                const t = new Date(a.scheduled_at);
                const borderColor = STATUS_BORDER_COLORS[a.status] || "border-l-slate-300";
                return (
                  <div key={a.id} className={`border border-slate-100 border-l-4 ${borderColor} rounded-xl p-4 hover:shadow-sm transition-shadow`}>
                    {/* Hora + Estado */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                        <span className="text-sm font-bold">
                          {t.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                        </span>
                      </div>
                      {appointmentStatusBadge(a.status)}
                    </div>
                    {/* Cliente */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {a.client_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{a.client_name}</p>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <span className="material-symbols-outlined text-xs">phone</span>
                            {a.client_phone}
                          </div>
                        </div>
                      </div>
                      {a.notes && (
                        <div className="flex items-start gap-1.5 bg-slate-50 rounded-lg px-3 py-2 mt-1">
                          <span className="material-symbols-outlined text-xs text-slate-400 mt-0.5">notes</span>
                          <p className="text-[11px] text-slate-600">{a.notes}</p>
                        </div>
                      )}
                    </div>
                    {/* Acciones rápidas */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-[10px] font-bold hover:bg-green-100 transition-colors">
                        <span className="material-symbols-outlined text-xs">chat</span> WhatsApp
                      </button>
                      <button className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold hover:bg-slate-100 transition-colors">
                        <span className="material-symbols-outlined text-xs">edit</span> Editar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Kanban View ── */
function KanbanView({ appointments }: { appointments: Appointment[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const col of KANBAN_COLUMNS) map[col] = [];
    for (const a of appointments) {
      if (map[a.status]) map[a.status].push(a);
    }
    return map;
  }, [appointments]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((col) => {
        const items = grouped[col] || [];
        return (
          <div key={col} className="flex-shrink-0 w-72 bg-slate-50 rounded-xl">
            {/* Column header */}
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-cool-grey">{STATUS_LABELS[col]}</span>
              <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full">{items.length}</span>
            </div>
            {/* Cards */}
            <div className="p-3 space-y-3 min-h-[200px]">
              {items.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">Sin turnos</p>
              )}
              {items.map((a) => {
                const d = new Date(a.scheduled_at);
                return (
                  <div
                    key={a.id}
                    className={`bg-white rounded-xl shadow-sm border border-slate-200 border-l-4 ${STATUS_BORDER_COLORS[a.status] || "border-l-slate-300"} p-4 hover:shadow-md transition-shadow`}
                  >
                    <p className="text-sm font-bold truncate">{a.client_name}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                      </div>
                      {a.client_phone && (
                        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-sm">phone</span>
                          {a.client_phone}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Page ── */
export default function TurnosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("lista");
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

  // For lista & calendario: apply both filters. For kanban: only date filter.
  const filtered = appointments.filter((a) => {
    if (view !== "kanban" && statusFilter !== "todos" && a.status !== statusFilter) return false;
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

  const viewOptions: { value: ViewMode; label: string; icon: string }[] = [
    { value: "lista", label: "Lista", icon: "view_list" },
    { value: "calendario", label: "Calendario", icon: "calendar_month" },
    { value: "kanban", label: "Kanban", icon: "view_kanban" },
  ];

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div className="flex items-center gap-4">
          {/* View toggle chips */}
          <div className="flex items-center gap-1.5 ml-2">
            {viewOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setView(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  view === opt.value
                    ? "bg-primary text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setShowAddModal(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm shadow-md shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">add</span> Nuevo Turno
        </button>
      </div>

      {/* Filters — Chips */}
      <div className="space-y-3 mb-6">
        {/* Status filter: hidden in kanban view */}
        {view !== "kanban" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-cool-grey uppercase tracking-widest mr-1">Estado</span>
            {[
              { value: "todos", label: "Todos" },
              { value: "pendiente", label: "Pendiente" },
              { value: "confirmado", label: "Confirmado" },
              { value: "completado", label: "Completado" },
              { value: "no_show", label: "No Show" },
              { value: "cancelado", label: "Cancelado" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                  statusFilter === opt.value
                    ? "bg-primary text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-cool-grey uppercase tracking-widest mr-1">Fecha</span>
          {[
            { value: "", label: "Todos" },
            { value: new Date().toISOString().slice(0, 10), label: "Hoy" },
          ].map((opt) => (
            <button
              key={opt.value || "all"}
              onClick={() => setDateFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                dateFilter === opt.value
                  ? "bg-primary text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1 bg-white rounded-full border border-slate-200 text-xs focus:ring-1 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      {/* ── Vista: Lista ── */}
      {view === "lista" && (
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
      )}

      {/* ── Vista: Calendario ── */}
      {view === "calendario" && (
        <CalendarView
          appointments={filtered}
          onDayClick={(date) => { setDateFilter(date); setView("lista"); }}
        />
      )}

      {/* ── Vista: Kanban ── */}
      {view === "kanban" && <KanbanView appointments={filtered} />}

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
