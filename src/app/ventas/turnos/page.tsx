"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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

interface IgClient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

type ViewMode = "lista" | "calendario" | "kanban";

const STATUS_COLORS: Record<string, string> = {
  confirmado: "bg-emerald-500/15 text-emerald-400",
  pendiente:  "bg-amber-500/15 text-amber-400",
  completado: "bg-blue-500/15 text-blue-400",
  no_show:    "bg-red-500/15 text-red-400",
  cancelado:  "bg-white/[0.08] text-white/55",
};
const STATUS_LABELS: Record<string, string> = {
  confirmado: "Confirmado", pendiente: "Pendiente",
  completado: "Completado", no_show: "No Show", cancelado: "Cancelado",
};
const STATUS_BORDER: Record<string, string> = {
  pendiente: "border-l-amber-400", confirmado: "border-l-emerald-400",
  completado: "border-l-blue-400", no_show: "border-l-red-400", cancelado: "border-l-white/20",
};
const STATUS_DOT: Record<string, string> = {
  confirmado: "bg-emerald-400", pendiente: "bg-amber-400",
  completado: "bg-blue-400", no_show: "bg-red-400", cancelado: "bg-white/30",
};
const KANBAN_COLS = ["pendiente", "confirmado", "completado", "no_show", "cancelado"] as const;
const MONTH_NAMES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAY_NAMES = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

function Badge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 ${STATUS_COLORS[status] || "bg-white/[0.06] text-white/55"} text-[10px] font-bold rounded-full whitespace-nowrap uppercase tracking-wide`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/* ── DarkSelect ── */
function DarkSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find(o => o.value === value);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white/70 focus:outline-none hover:border-white/[0.15] transition-colors">
        <span>{current?.label || "Seleccionar"}</span>
        <span className="material-symbols-outlined text-[16px] text-white/35">{open ? "expand_less" : "expand_more"}</span>
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[#1e1e22] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-white/[0.06] ${value === opt.value ? "text-[#3eff8e] font-semibold" : "text-white/65"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── AppointmentActions ── */
function AppointmentActions({ a, onStatus, onEdit, onDelete, compact = false }: {
  a: Appointment; onStatus: (id: string, s: string) => void;
  onEdit: (a: Appointment) => void; onDelete: (id: string) => void; compact?: boolean;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const isPendiente = a.status === "pendiente";
  const canChange = a.status === "pendiente" || a.status === "confirmado";
  const canDel = a.status !== "completado";
  const base = compact
    ? "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors"
    : "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors";
  return (
    <div className="flex flex-wrap gap-1.5">
      {isPendiente && <button onClick={() => onStatus(a.id, "confirmado")} className={`${base} bg-blue-500/15 text-blue-400 hover:bg-blue-500/25`}><span className="material-symbols-outlined text-xs">check_circle</span>{!compact && "Confirmar"}</button>}
      {canChange && <button onClick={() => onStatus(a.id, "completado")} className={`${base} bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25`}><span className="material-symbols-outlined text-xs">task_alt</span>{!compact && "Completar"}</button>}
      {canChange && <button onClick={() => onStatus(a.id, "no_show")} className={`${base} bg-red-500/15 text-red-400 hover:bg-red-500/25`}><span className="material-symbols-outlined text-xs">person_off</span>{!compact && "No Show"}</button>}
      {canChange && <button onClick={() => onStatus(a.id, "cancelado")} className={`${base} bg-white/[0.06] text-white/50 hover:bg-white/[0.1]`}><span className="material-symbols-outlined text-xs">cancel</span>{!compact && "Cancelar"}</button>}
      <button onClick={() => onEdit(a)} className={`${base} bg-white/[0.04] text-white/50 hover:bg-white/[0.08]`}><span className="material-symbols-outlined text-xs">edit</span>{!compact && "Editar"}</button>
      {canDel && (
        confirmDel
          ? <div className="flex items-center gap-1">
              <button onClick={() => { onDelete(a.id); setConfirmDel(false); }} className={`${base} bg-red-600 text-white hover:bg-red-700`}><span className="material-symbols-outlined text-xs">delete_forever</span> Sí</button>
              <button onClick={() => setConfirmDel(false)} className={`${base} bg-white/[0.06] text-white/50`}>No</button>
            </div>
          : <button onClick={() => setConfirmDel(true)} className={`${base} bg-red-500/10 text-red-400 hover:bg-red-500/20`}><span className="material-symbols-outlined text-xs">delete</span></button>
      )}
    </div>
  );
}

/* ── Calendar helpers ── */
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfWeek(y: number, m: number) { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; }

/* ── CalendarView ── */
function CalendarView({ appointments, onStatus, onEdit, onDelete }: {
  appointments: Appointment[];
  onStatus: (id: string, s: string) => void;
  onEdit: (a: Appointment) => void;
  onDelete: (id: string) => void;
}) {
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const [selectedDay, setSelectedDay] = useState(todayISO);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);
  const prevMonthDays = getDaysInMonth(calYear, calMonth - 1);

  const byDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of appointments) {
      const k = a.scheduled_at.slice(0, 10);
      if (!map[k]) map[k] = [];
      map[k].push(a);
    }
    return map;
  }, [appointments]);

  const cells: { day: number; inMonth: boolean; dateStr: string; isWeekend: boolean }[] = [];
  for (let i = 0; i < firstDay; i++) {
    const d = prevMonthDays - firstDay + 1 + i;
    const m = calMonth === 0 ? 12 : calMonth;
    const y = calMonth === 0 ? calYear - 1 : calYear;
    cells.push({ day: d, inMonth: false, dateStr: `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`, isWeekend: i % 7 >= 5 });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const col = (firstDay + d - 1) % 7;
    cells.push({ day: d, inMonth: true, dateStr: `${calYear}-${String(calMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, isWeekend: col >= 5 });
  }
  const rem = 7 - (cells.length % 7);
  if (rem < 7) for (let d = 1; d <= rem; d++) {
    const m = calMonth === 11 ? 1 : calMonth + 2;
    const y = calMonth === 11 ? calYear + 1 : calYear;
    cells.push({ day: d, inMonth: false, dateStr: `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`, isWeekend: cells.length % 7 >= 5 });
  }

  const selAppts = byDate[selectedDay] || [];
  const selDate = new Date(selectedDay + "T12:00:00");
  const selLabel = selectedDay === todayISO ? "Hoy" : selDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });

  function prevMonth() { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11); } else setCalMonth(m => m-1); }
  function nextMonth() { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0); } else setCalMonth(m => m+1); }

  return (
    <div className="grid grid-cols-12 gap-5">
      {/* Calendar grid */}
      <div className="col-span-8 rounded-[20px] bg-white/[0.03] border border-white/[0.06] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors">
            <span className="material-symbols-outlined text-lg text-white/50">chevron_left</span>
          </button>
          <h3 className="text-sm font-bold">{MONTH_NAMES[calMonth]} {calYear}</h3>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors">
            <span className="material-symbols-outlined text-lg text-white/50">chevron_right</span>
          </button>
        </div>
        <div className="grid grid-cols-7 border-b border-white/[0.04] px-2">
          {DAY_NAMES.map((d, i) => (
            <div key={d} className={`py-2 text-center text-[10px] font-semibold uppercase tracking-wider ${i >= 5 ? "text-white/30" : "text-white/40"}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 px-2 pb-2">
          {cells.map((cell, idx) => {
            const isToday = cell.dateStr === todayISO;
            const isSelected = cell.dateStr === selectedDay && cell.inMonth;
            const appts = byDate[cell.dateStr] || [];
            return (
              <div key={idx} onClick={() => cell.inMonth && setSelectedDay(cell.dateStr)}
                className={`min-h-[68px] m-0.5 p-1.5 rounded-xl transition-all ${cell.inMonth ? "cursor-pointer hover:bg-white/[0.04]" : "opacity-30"} ${isSelected && !isToday ? "ring-1 ring-[#3eff8e]/40 bg-[#3eff8e]/[0.06]" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  {isToday
                    ? <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#3eff8e] text-black text-xs font-bold">{cell.day}</span>
                    : <span className={`text-xs font-semibold ${cell.inMonth ? "text-white/65" : "text-white/20"}`}>{cell.day}</span>
                  }
                </div>
                {appts.length > 0 && (
                  <div className="flex gap-0.5 flex-wrap">
                    {appts.slice(0, 5).map(a => (
                      <span key={a.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[a.status] || "bg-white/30"}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail */}
      <div className="col-span-4 sticky top-4">
        <div className="rounded-[20px] bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-bold capitalize">{selLabel}</h3>
            <p className="text-[10px] text-white/40 mt-0.5">{selAppts.length} turno{selAppts.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="p-3 space-y-2.5 max-h-[500px] overflow-y-auto">
            {selAppts.length === 0
              ? <div className="flex flex-col items-center justify-center py-12 text-white/35"><span className="material-symbols-outlined text-3xl mb-2">event_available</span><p className="text-xs">Sin turnos</p></div>
              : selAppts.map(a => {
                const t = new Date(a.scheduled_at);
                return (
                  <div key={a.id} className={`border border-white/[0.06] border-l-4 ${STATUS_BORDER[a.status] || "border-l-white/20"} rounded-xl p-3.5`}>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-sm font-bold">{t.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs</span>
                      <Badge status={a.status} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-[#3eff8e]/15 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-[#3eff8e]">{a.client_name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{a.client_name}</p>
                        <p className="text-[10px] text-white/45">{a.client_phone}</p>
                      </div>
                    </div>
                    {a.notes && <p className="text-[10px] text-white/45 bg-white/[0.03] rounded-lg px-2.5 py-1.5 mb-2">{a.notes}</p>}
                    <div className="pt-2 border-t border-white/[0.05]">
                      <AppointmentActions a={a} onStatus={onStatus} onEdit={onEdit} onDelete={onDelete} compact />
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── KanbanView ── */
function KanbanView({ appointments, onStatus, onEdit, onDelete }: {
  appointments: Appointment[];
  onStatus: (id: string, s: string) => void;
  onEdit: (a: Appointment) => void;
  onDelete: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const col of KANBAN_COLS) map[col] = [];
    for (const a of appointments) { if (map[a.status]) map[a.status].push(a); }
    return map;
  }, [appointments]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {KANBAN_COLS.map(col => {
        const items = grouped[col] || [];
        return (
          <div key={col} className="shrink-0 w-72 flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[col] || "bg-white/30"}`} />
              <span className="text-xs font-bold uppercase tracking-widest text-white/50 flex-1">{STATUS_LABELS[col]}</span>
              <span className="text-[10px] font-bold text-white/35 bg-white/[0.06] px-2 py-0.5 rounded-full">{items.length}</span>
            </div>
            <div className="p-3 space-y-2.5 overflow-y-auto flex-1 min-h-[200px]">
              {items.length === 0
                ? <p className="text-xs text-white/30 text-center py-10">Sin turnos</p>
                : items.map(a => {
                  const d = new Date(a.scheduled_at);
                  return (
                    <div key={a.id} className={`border border-white/[0.06] border-l-4 ${STATUS_BORDER[a.status]} rounded-xl p-3`}>
                      <p className="text-xs font-bold truncate mb-1.5">{a.client_name}</p>
                      <div className="space-y-0.5 mb-3">
                        <div className="flex items-center gap-1.5 text-[10px] text-white/45">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          {d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} · {d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                        </div>
                        {a.client_phone && (
                          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                            <span className="material-symbols-outlined text-xs">phone</span>
                            {a.client_phone}
                          </div>
                        )}
                        {a.notes && <p className="text-[10px] text-white/35 truncate pt-0.5">{a.notes}</p>}
                      </div>
                      <div className="pt-2 border-t border-white/[0.05]">
                        <AppointmentActions a={a} onStatus={onStatus} onEdit={onEdit} onDelete={onDelete} compact />
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}

function isoToLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = { client_name: "", client_phone: "", sched_date: "", sched_time: "10:00", status: "pendiente", notes: "", product_id: "" };

/* ── Main ── */
export default function TurnosPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("lista");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Client autocomplete
  const [clientResults, setClientResults] = useState<IgClient[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const clientSearchRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("ig_appointments").select("*").order("scheduled_at", { ascending: true });
      setAppointments((data || []) as Appointment[]);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Client search
  useEffect(() => {
    if (clientSearch.length < 2) { setClientResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from("ig_clients").select("id,name,phone,email")
        .or(`name.ilike.%${clientSearch}%,phone.ilike.%${clientSearch}%`).limit(6);
      setClientResults((data || []) as IgClient[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [clientSearch]);

  // Close client dropdown on outside click
  useEffect(() => {
    function h(e: MouseEvent) { if (clientSearchRef.current && !clientSearchRef.current.contains(e.target as Node)) setClientResults([]); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // KPIs
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const monthStr = today.toISOString().slice(0, 7);

  const kpis = useMemo(() => {
    const pendientesHoy = appointments.filter(a => a.scheduled_at.startsWith(todayStr) && a.status === "pendiente").length;
    const confirmadosHoy = appointments.filter(a => a.scheduled_at.startsWith(todayStr) && a.status === "confirmado").length;
    const estaSemana = appointments.filter(a => a.scheduled_at.slice(0,10) >= weekStartStr && (a.status === "pendiente" || a.status === "confirmado")).length;
    const noShowsMes = appointments.filter(a => a.scheduled_at.startsWith(monthStr) && a.status === "no_show").length;
    return { pendientesHoy, confirmadosHoy, estaSemana, noShowsMes };
  }, [appointments, todayStr, weekStartStr, monthStr]);

  // Filter logic
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const filtered = appointments.filter(a => {
    if (view !== "kanban" && statusFilter !== "todos" && a.status !== statusFilter) return false;
    if (dateFilter && !a.scheduled_at.startsWith(dateFilter)) return false;
    if (search && !a.client_name.toLowerCase().includes(search.toLowerCase()) &&
        !a.client_phone.includes(search)) return false;
    return true;
  });

  function openAdd(prefillDate?: string) {
    setEditingId(null);
    setForm({ ...emptyForm, sched_date: prefillDate || "", sched_time: "10:00" });
    setClientSearch("");
    setClientResults([]);
    setShowModal(true);
  }

  function openEdit(a: Appointment) {
    setEditingId(a.id);
    const local = isoToLocalInput(a.scheduled_at);
    setForm({ client_name: a.client_name, client_phone: a.client_phone, sched_date: local.slice(0,10), sched_time: local.slice(11,16), status: a.status, notes: a.notes || "", product_id: a.product_id || "" });
    setClientSearch(a.client_name);
    setClientResults([]);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const scheduled_at = new Date(`${form.sched_date}T${form.sched_time}`).toISOString();
    const payload = { client_name: form.client_name, client_phone: form.client_phone, scheduled_at, status: form.status, notes: form.notes || null, product_id: form.product_id || null };
    let error;
    if (editingId) { ({ error } = await supabase.from("ig_appointments").update(payload).eq("id", editingId)); }
    else { ({ error } = await supabase.from("ig_appointments").insert(payload)); }
    if (!error) { setShowModal(false); setForm(emptyForm); setEditingId(null); await fetchData(); }
    else alert("Error: " + error.message);
    setSaving(false);
  }

  async function handleStatus(id: string, newStatus: string) {
    await supabase.from("ig_appointments").update({ status: newStatus }).eq("id", id);
    await fetchData();
  }

  async function handleDelete(id: string) {
    await supabase.from("ig_appointments").delete().eq("id", id);
    await fetchData();
  }

  if (loading) return (
    <div className="flex items-center justify-center" style={{ height: "calc(100vh - 56px)" }}>
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/10 border-t-[#3eff8e]" />
      <span className="ml-3 text-sm text-white/40">Cargando turnos...</span>
    </div>
  );

  const viewOpts: { value: ViewMode; label: string; icon: string }[] = [
    { value: "lista", label: "Lista", icon: "view_list" },
    { value: "calendario", label: "Calendario", icon: "calendar_month" },
    { value: "kanban", label: "Kanban", icon: "view_kanban" },
  ];

  const dateOpts = [
    { value: "", label: "Todos" },
    { value: todayStr, label: "Hoy" },
    { value: tomorrowStr, label: "Mañana" },
  ];

  return (
    <div className="px-8 py-8 overflow-y-auto flex-1">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {[
          { label: "Pendientes hoy",   value: kpis.pendientesHoy,  icon: "pending_actions", color: "text-amber-400" },
          { label: "Confirmados hoy",  value: kpis.confirmadosHoy, icon: "event_available",  color: "text-emerald-400" },
          { label: "Esta semana",      value: kpis.estaSemana,     icon: "calendar_view_week", color: "text-blue-400" },
          { label: "No shows (mes)",   value: kpis.noShowsMes,     icon: "person_off",        color: "text-red-400" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-[0.12em] text-white/40 font-semibold">{kpi.label}</span>
              <span className={`material-symbols-outlined text-[18px] ${kpi.color} opacity-60`}>{kpi.icon}</span>
            </div>
            <p className={`text-[32px] font-semibold leading-none ${kpi.value > 0 ? kpi.color : "text-white/25"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.06] rounded-xl p-1">
          {viewOpts.map(opt => (
            <button key={opt.value} onClick={() => setView(opt.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === opt.value ? "bg-white/[0.1] text-white/80" : "text-white/40 hover:text-white/60"}`}>
              <span className="material-symbols-outlined text-[14px]">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 flex-1 min-w-[180px] max-w-[260px]">
          <span className="material-symbols-outlined text-white/35 text-base">search</span>
          <input type="text" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-white/70 placeholder:text-white/35 outline-none w-full" />
        </div>

        {/* Status filter (not kanban) */}
        {view !== "kanban" && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {["todos","pendiente","confirmado","completado","no_show","cancelado"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${statusFilter === s ? "bg-[#3eff8e]/15 border border-[#3eff8e]/25 text-[#3eff8e]" : "bg-white/[0.04] text-white/45 hover:bg-white/[0.07] hover:text-white/65"}`}>
                {STATUS_LABELS[s] || "Todos"}
              </button>
            ))}
          </div>
        )}

        {/* Date filter */}
        <div className="flex items-center gap-1.5">
          {dateOpts.map(opt => (
            <button key={opt.value || "all"} onClick={() => setDateFilter(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${dateFilter === opt.value ? "bg-white/[0.1] text-white/80" : "bg-white/[0.04] text-white/40 hover:text-white/60"}`}>
              {opt.label}
            </button>
          ))}
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white/[0.04] border border-white/[0.07] rounded-xl text-xs text-white/50 focus:outline-none focus:border-white/[0.15] transition-colors" />
        </div>

        <div className="ml-auto">
          <button onClick={() => openAdd()}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#3eff8e]/15 border border-[#3eff8e]/25 text-[#3eff8e] rounded-xl font-bold text-sm hover:bg-[#3eff8e]/25 transition-colors">
            <span className="material-symbols-outlined text-lg">add</span> Nuevo Turno
          </button>
        </div>
      </div>

      {/* Views */}
      {view === "lista" && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
          {filtered.length === 0
            ? <div className="flex flex-col items-center justify-center py-20 text-white/35"><span className="material-symbols-outlined text-4xl mb-2">calendar_month</span><p className="text-sm">Sin turnos para mostrar</p></div>
            : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03]">
                    {["Fecha / Hora","Cliente","Teléfono","Estado","Notas","Acciones"].map(h => (
                      <th key={h} className="px-5 py-3.5 text-[10px] uppercase tracking-widest font-bold text-white/40">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(a => {
                    const d = new Date(a.scheduled_at);
                    const isToday = a.scheduled_at.startsWith(todayStr);
                    const isPast = new Date(a.scheduled_at) < new Date() && !["completado","cancelado","no_show"].includes(a.status);
                    return (
                      <tr key={a.id} className={`hover:bg-white/[0.025] transition-colors ${isPast ? "opacity-60" : ""}`}>
                        <td className="px-5 py-4">
                          <p className={`text-sm font-bold ${isToday ? "text-[#3eff8e]" : ""}`}>{d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                          <p className="text-[10px] text-white/40">{d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-white/50">{a.client_name.slice(0,2).toUpperCase()}</span>
                            </div>
                            <span className="text-sm font-medium text-white/75">{a.client_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-white/50">{a.client_phone}</td>
                        <td className="px-5 py-4"><Badge status={a.status} /></td>
                        <td className="px-5 py-4 text-xs text-white/45 max-w-[180px] truncate">{a.notes || "—"}</td>
                        <td className="px-5 py-4">
                          <AppointmentActions a={a} onStatus={handleStatus} onEdit={openEdit} onDelete={handleDelete} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          }
          <div className="px-5 py-3 bg-white/[0.02] border-t border-white/[0.05] text-[11px] text-white/35 font-medium">
            {filtered.length} turno{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {view === "calendario" && (
        <CalendarView appointments={filtered} onStatus={handleStatus} onEdit={openEdit} onDelete={handleDelete} />
      )}

      {view === "kanban" && (
        <div className="h-[calc(100vh-340px)]">
          <KanbanView appointments={filtered} onStatus={handleStatus} onEdit={openEdit} onDelete={handleDelete} />
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#1a1a1d] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-base font-bold">{editingId ? "Editar Turno" : "Nuevo Turno"}</h3>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white/70 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              {/* Client autocomplete */}
              <div ref={clientSearchRef} className="relative">
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 block mb-1.5">Cliente</label>
                <input type="text" placeholder="Buscar cliente o escribir nombre..."
                  value={clientSearch}
                  onChange={e => { setClientSearch(e.target.value); setForm(f => ({ ...f, client_name: e.target.value })); }}
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/70 placeholder:text-white/30 outline-none focus:border-white/[0.2] transition-colors" />
                {clientResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-[#1e1e22] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden">
                    {clientResults.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setForm(f => ({ ...f, client_name: c.name, client_phone: c.phone || f.client_phone })); setClientSearch(c.name); setClientResults([]); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-white/[0.06] transition-colors flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-white/50">{c.name.slice(0,2).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm text-white/75 font-medium">{c.name}</p>
                          {c.phone && <p className="text-[10px] text-white/40">{c.phone}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 block mb-1.5">Teléfono *</label>
                <input required value={form.client_phone} onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/70 placeholder:text-white/30 outline-none focus:border-white/[0.2] transition-colors"
                  placeholder="+54 11..." />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 block mb-1.5">Fecha y Hora *</label>
                <div className="flex gap-2">
                  <input type="date" required value={form.sched_date} onChange={e => setForm(f => ({ ...f, sched_date: e.target.value }))}
                    className="flex-1 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors [color-scheme:dark]" />
                  <input type="time" required value={form.sched_time} onChange={e => setForm(f => ({ ...f, sched_time: e.target.value }))}
                    className="w-28 px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/70 outline-none focus:border-white/[0.2] transition-colors [color-scheme:dark]" />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 block mb-1.5">Estado</label>
                <DarkSelect value={form.status} onChange={v => setForm(f => ({ ...f, status: v }))}
                  options={[
                    { value: "pendiente", label: "Pendiente" },
                    { value: "confirmado", label: "Confirmado" },
                    ...(editingId ? [
                      { value: "completado", label: "Completado" },
                      { value: "no_show", label: "No Show" },
                      { value: "cancelado", label: "Cancelado" },
                    ] : []),
                  ]} />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 block mb-1.5">Notas</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/70 placeholder:text-white/30 outline-none focus:border-white/[0.2] resize-none transition-colors"
                  placeholder="Detalles del turno..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl text-sm font-bold transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-[#3eff8e]/15 border border-[#3eff8e]/25 text-[#3eff8e] rounded-xl text-sm font-bold hover:bg-[#3eff8e]/25 transition-colors disabled:opacity-40">
                  {saving ? "Guardando..." : editingId ? "Guardar" : "Crear Turno"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
