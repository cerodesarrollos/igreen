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
  confirmado: "bg-emerald-500/15 text-emerald-400",
  pendiente: "bg-amber-500/15 text-amber-400",
  completado: "bg-blue-500/15 text-blue-400",
  no_show: "bg-red-500/15 text-red-400",
  cancelado: "bg-white/[0.08] text-white/55",
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
    <span className={`px-2.5 py-0.5 ${STATUS_COLORS[s] || "bg-white/[0.06] text-white/55"} text-[10px] font-bold rounded-full whitespace-nowrap`}>
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

/* ── Action Buttons Component ── */
function AppointmentActions({
  appointment,
  onStatusChange,
  onEdit,
  onDelete,
  compact = false,
}: {
  appointment: Appointment;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (a: Appointment) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canChangeStatus = appointment.status === "pendiente" || appointment.status === "confirmado";
  const canDelete = appointment.status !== "completado";
  const isPendiente = appointment.status === "pendiente";

  const btnBase = compact
    ? "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors"
    : "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors";

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* Confirmar — only for pendiente */}
      {isPendiente && (
        <button
          onClick={() => onStatusChange(appointment.id, "confirmado")}
          className={`${btnBase} bg-blue-500/15 text-blue-400 hover:bg-blue-500/15`}
          title="Confirmar turno"
        >
          <span className="material-symbols-outlined text-xs">check_circle</span>
          {!compact && "Confirmar"}
        </button>
      )}
      {/* Completar */}
      {canChangeStatus && (
        <button
          onClick={() => onStatusChange(appointment.id, "completado")}
          className={`${btnBase} bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15`}
          title="Marcar como completado"
        >
          <span className="material-symbols-outlined text-xs">task_alt</span>
          {!compact && "Completar"}
        </button>
      )}
      {/* No Show */}
      {canChangeStatus && (
        <button
          onClick={() => onStatusChange(appointment.id, "no_show")}
          className={`${btnBase} bg-red-500/15 text-red-400 hover:bg-red-500/15`}
          title="Marcar como No Show"
        >
          <span className="material-symbols-outlined text-xs">person_off</span>
          {!compact && "No Show"}
        </button>
      )}
      {/* Cancelar */}
      {canChangeStatus && (
        <button
          onClick={() => onStatusChange(appointment.id, "cancelado")}
          className={`${btnBase} bg-white/[0.06] text-white/55 hover:bg-white/[0.08]`}
          title="Cancelar turno"
        >
          <span className="material-symbols-outlined text-xs">cancel</span>
          {!compact && "Cancelar"}
        </button>
      )}
      {/* Editar */}
      <button
        onClick={() => onEdit(appointment)}
        className={`${btnBase} bg-white/[0.03] text-white/55 hover:bg-white/[0.06]`}
        title="Editar turno"
      >
        <span className="material-symbols-outlined text-xs">edit</span>
        {!compact && "Editar"}
      </button>
      {/* Eliminar — not for completado */}
      {canDelete && (
        <>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => { onDelete(appointment.id); setConfirmDelete(false); }}
                className={`${btnBase} bg-red-600 text-white hover:bg-red-700`}
              >
                <span className="material-symbols-outlined text-xs">delete_forever</span> Sí, eliminar
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className={`${btnBase} bg-white/[0.06] text-white/55 hover:bg-white/[0.08]`}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className={`${btnBase} bg-red-500/15 text-red-400 hover:bg-red-500/15`}
              title="Eliminar turno"
            >
              <span className="material-symbols-outlined text-xs">delete</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}

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
function CalendarView({
  appointments,
  onDayClick,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  appointments: Appointment[];
  onDayClick?: (date: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (a: Appointment) => void;
  onDelete: (id: string) => void;
}) {
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
      <div className="col-span-8 rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 overflow-hidden">
        {/* Nav header */}
        <div className="flex items-center justify-between px-6 py-4">
          <button onClick={prevMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors">
            <span className="material-symbols-outlined text-lg text-white/50">chevron_left</span>
          </button>
          <h3 className="text-base font-bold tracking-tight">{MONTH_NAMES[calMonth]} {calYear}</h3>
          <button onClick={nextMonth} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors">
            <span className="material-symbols-outlined text-lg text-white/50">chevron_right</span>
          </button>
        </div>
        {/* Day names */}
        <div className="grid grid-cols-7 px-2">
          {DAY_NAMES.map((d, i) => (
            <div key={d} className={`py-2 text-center text-[10px] font-semibold uppercase tracking-wider ${i >= 5 ? "text-white/35" : "text-white/45"}`}>{d}</div>
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
                  cell.inMonth ? "cursor-pointer hover:bg-white/[0.03]" : ""
                } ${cell.isWeekend && cell.inMonth ? "bg-white/[0.02]" : ""
                } ${isSelected && !isToday ? "ring-2 ring-[#3eff8e]/40 bg-[#3eff8e]/10" : ""}`}
              >
                <div className="flex items-center gap-1">
                  {isToday ? (
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e] text-xs font-bold ${isSelected ? "ring-2 ring-[#3eff8e]/30 ring-offset-1" : ""}`}>
                      {cell.day}
                    </span>
                  ) : (
                    <span className={`text-sm font-semibold pl-1 ${cell.inMonth ? "text-white/70" : "text-white/20"}`}>
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
        <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 overflow-hidden sticky top-4">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold capitalize">{selectedLabel}</h3>
            <p className="text-[10px] text-white/45 mt-0.5">
              {selectedAppts.length} turno{selectedAppts.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Turnos del día */}
          <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
            {selectedAppts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-white/45">
                <span className="material-symbols-outlined text-3xl mb-2">event_available</span>
                <p className="text-xs font-medium">Sin turnos este día</p>
              </div>
            ) : (
              selectedAppts.map((a) => {
                const t = new Date(a.scheduled_at);
                const borderColor = STATUS_BORDER_COLORS[a.status] || "border-l-slate-300";
                return (
                  <div key={a.id} className={`border border-white/[0.06] border-l-4 ${borderColor} rounded-xl p-4  transition-shadow`}>
                    {/* Hora + Estado */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-white/45">schedule</span>
                        <span className="text-sm font-bold">
                          {t.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
                        </span>
                      </div>
                      {appointmentStatusBadge(a.status)}
                    </div>
                    {/* Cliente */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#3eff8e]/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-[#3eff8e]">
                            {a.client_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{a.client_name}</p>
                          <div className="flex items-center gap-1 text-[11px] text-white/50">
                            <span className="material-symbols-outlined text-xs">phone</span>
                            {a.client_phone}
                          </div>
                        </div>
                      </div>
                      {a.notes && (
                        <div className="flex items-start gap-1.5 bg-white/[0.03] rounded-lg px-3 py-2 mt-1">
                          <span className="material-symbols-outlined text-xs text-white/45 mt-0.5">notes</span>
                          <p className="text-[11px] text-white/55">{a.notes}</p>
                        </div>
                      )}
                    </div>
                    {/* Acciones rápidas */}
                    <div className="mt-3 pt-3 border-t border-white/[0.06]">
                      <AppointmentActions
                        appointment={a}
                        onStatusChange={onStatusChange}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        compact
                      />
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
          <div key={col} className="flex-shrink-0 w-72 bg-white/[0.03] rounded-xl">
            {/* Column header */}
            <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-white/45">{STATUS_LABELS[col]}</span>
              <span className="px-2 py-0.5 bg-white/[0.08] text-white/55 text-[10px] font-bold rounded-full">{items.length}</span>
            </div>
            {/* Cards */}
            <div className="p-3 space-y-3 min-h-[200px]">
              {items.length === 0 && (
                <p className="text-xs text-white/45 text-center py-8">Sin turnos</p>
              )}
              {items.map((a) => {
                const d = new Date(a.scheduled_at);
                return (
                  <div
                    key={a.id}
                    className={`rounded-xl p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 border-l-4 ${STATUS_BORDER_COLORS[a.status] || "border-l-slate-300"} p-4  transition-shadow`}
                  >
                    <p className="text-sm font-bold truncate">{a.client_name}</p>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-white/50">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/50">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        {d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                      </div>
                      {a.client_phone && (
                        <div className="flex items-center gap-1.5 text-xs text-white/50">
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

/* ── Helper: convert ISO datetime to datetime-local input value ── */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── Main Page ── */
export default function TurnosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("lista");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  /* ── Open modal for add ── */
  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  /* ── Open modal for edit ── */
  function openEditModal(a: Appointment) {
    setEditingId(a.id);
    setForm({
      client_name: a.client_name,
      client_phone: a.client_phone,
      scheduled_at: isoToLocalInput(a.scheduled_at),
      status: a.status,
      notes: a.notes || "",
      product_id: a.product_id || "",
    });
    setShowModal(true);
  }

  /* ── Save (add or update) ── */
  async function handleSave(e: React.FormEvent) {
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

    let error;
    if (editingId) {
      ({ error } = await supabase.from("ig_appointments").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("ig_appointments").insert(payload));
    }

    if (!error) {
      setShowModal(false);
      setForm(emptyForm);
      setEditingId(null);
      await fetchData();
    } else {
      alert("Error: " + error.message);
    }
    setSaving(false);
  }

  /* ── Quick status change ── */
  async function handleStatusChange(id: string, newStatus: string) {
    const { error } = await supabase.from("ig_appointments").update({ status: newStatus }).eq("id", id);
    if (!error) {
      await fetchData();
    } else {
      alert("Error al cambiar estado: " + error.message);
    }
  }

  /* ── Delete ── */
  async function handleDelete(id: string) {
    const { error } = await supabase.from("ig_appointments").delete().eq("id", id);
    if (!error) {
      await fetchData();
    } else {
      alert("Error al eliminar: " + error.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3eff8e]"></div>
        <span className="ml-3 text-sm text-white/45">Cargando turnos...</span>
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
                    ? "bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e]"
                    : "bg-white/[0.06] text-white/55 hover:bg-white/[0.08]"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-6 py-3 bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e] rounded-full font-bold text-sm "
        >
          <span className="material-symbols-outlined text-lg">add</span> Nuevo Turno
        </button>
      </div>

      {/* Filters — Chips */}
      <div className="space-y-3 mb-6">
        {/* Status filter: hidden in kanban view */}
        {view !== "kanban" && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest mr-1">Estado</span>
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
                    ? "bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e]"
                    : "bg-white/[0.06] text-white/55 hover:bg-white/[0.08]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-white/45 uppercase tracking-widest mr-1">Fecha</span>
          {[
            { value: "", label: "Todos" },
            { value: new Date().toISOString().slice(0, 10), label: "Hoy" },
          ].map((opt) => (
            <button
              key={opt.value || "all"}
              onClick={() => setDateFilter(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                dateFilter === opt.value
                  ? "bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e]"
                  : "bg-white/[0.06] text-white/55 hover:bg-white/[0.08]"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-1">
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1 bg-[#1a1a1d] rounded-full border border-white/[0.08] text-xs focus:ring-1 focus:ring-[#3eff8e]/30" />
          </div>
        </div>
      </div>

      {/* ── Vista: Lista ── */}
      {view === "lista" && (
        <div className="rounded-xl p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/45">
              <span className="material-symbols-outlined text-4xl mb-3">calendar_month</span>
              <p className="text-sm font-medium">No hay turnos para mostrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Fecha / Hora</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Cliente</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Teléfono</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Estado</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Notas</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map((a) => {
                    const d = new Date(a.scheduled_at);
                    return (
                      <tr key={a.id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold">{d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                          <p className="text-[10px] text-white/45">{d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</p>
                        </td>
                        <td className="px-4 py-4 text-sm font-medium">{a.client_name}</td>
                        <td className="px-4 py-4 text-sm text-white/50">{a.client_phone}</td>
                        <td className="px-4 py-4">{appointmentStatusBadge(a.status)}</td>
                        <td className="px-4 py-4 text-xs text-white/50 max-w-[200px] truncate">{a.notes || "—"}</td>
                        <td className="px-4 py-4">
                          <AppointmentActions
                            appointment={a}
                            onStatusChange={handleStatusChange}
                            onEdit={openEditModal}
                            onDelete={handleDelete}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-4 bg-white/[0.03] text-xs font-medium text-white/45 border-t border-white/[0.06]">
            {filtered.length} turno{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* ── Vista: Calendario ── */}
      {view === "calendario" && (
        <CalendarView
          appointments={filtered}
          onDayClick={(date) => { setDateFilter(date); setView("lista"); }}
          onStatusChange={handleStatusChange}
          onEdit={openEditModal}
          onDelete={handleDelete}
        />
      )}

      {/* ── Vista: Kanban ── */}
      {view === "kanban" && <KanbanView appointments={filtered} />}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#1a1a1d] border border-white/[0.10] rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingId ? "Editar Turno" : "Nuevo Turno"}</h3>
              <button onClick={() => setShowModal(false)} className="text-white/45 hover:text-white/80">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-white/45 uppercase tracking-widest">Nombre del Cliente *</label>
                <input required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-white/45 uppercase tracking-widest">Teléfono *</label>
                <input required value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30"
                  placeholder="+54 11 ..." />
              </div>
              <div>
                <label className="text-xs font-bold text-white/45 uppercase tracking-widest">Fecha y Hora *</label>
                <input type="datetime-local" required value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-white/45 uppercase tracking-widest">Estado</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30">
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmado">Confirmado</option>
                  {editingId && <option value="completado">Completado</option>}
                  {editingId && <option value="no_show">No Show</option>}
                  {editingId && <option value="cancelado">Cancelado</option>}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-white/45 uppercase tracking-widest">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-[#3eff8e]/30 resize-none"
                  rows={2} placeholder="Detalles del turno..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white/[0.08] rounded-full text-sm font-bold hover:bg-white/[0.10] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-[#3eff8e]/20 border border-[#3eff8e]/30 text-[#3eff8e] rounded-full text-sm font-bold  hover:brightness-95 transition-all disabled:opacity-50">
                  {saving ? "Guardando..." : editingId ? "Guardar Cambios" : "Crear Turno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
