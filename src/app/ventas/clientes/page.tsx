"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";

/* ───── types ───── */
interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  source: string | null;
  role: "comprador" | "vendedor" | "ambos";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  instagram: "",
  role: "comprador" as "comprador" | "vendedor" | "ambos",
  notes: "",
};

type RoleFilter = "todos" | "comprador" | "vendedor" | "ambos";

/* ───── helpers ───── */
function roleLabel(r: string) {
  return r === "comprador" ? "Comprador" : r === "vendedor" ? "Vendedor" : "Ambos";
}
function roleBadgeClasses(r: string) {
  if (r === "comprador") return "bg-blue-500/15 text-blue-400 border border-blue-200";
  if (r === "vendedor") return "bg-amber-500/15 text-amber-400 border border-amber-200";
  return "bg-emerald-500/15 text-emerald-400 border border-emerald-200";
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

/* ───── component ───── */
export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("todos");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ig_clients").select("*").order("name");
    setClients((data || []) as Client[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── filtering ── */
  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (roleFilter !== "todos" && c.role !== roleFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    });
  }, [clients, search, roleFilter]);

  /* ── KPI calculations ── */
  const kpis = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      total: clients.length,
      newThisMonth: clients.filter((c) => new Date(c.created_at) >= monthStart).length,
      compradores: clients.filter((c) => c.role === "comprador" || c.role === "ambos").length,
      vendedores: clients.filter((c) => c.role === "vendedor" || c.role === "ambos").length,
    };
  }, [clients]);

  /* ── actions ── */
  function openAdd() {
    setEditingClient(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name,
      phone: client.phone || "",
      email: client.email || "",
      instagram: client.instagram || "",
      role: client.role || "comprador",
      notes: client.notes || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      instagram: form.instagram || null,
      role: form.role,
      notes: form.notes || null,
    };

    if (editingClient) {
      const { error } = await supabase.from("ig_clients").update(payload).eq("id", editingClient.id);
      if (error) { alert("Error: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("ig_clients").insert(payload);
      if (error) { alert("Error: " + error.message); setSaving(false); return; }
    }

    setShowModal(false);
    setEditingClient(null);
    setForm(emptyForm);
    await fetchData();
    setSaving(false);
    // Update selected if editing same
    if (editingClient && selectedClient?.id === editingClient.id) {
      setSelectedClient({ ...editingClient, ...payload } as Client);
    }
  }

  /* ── loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
        <span className="ml-3 text-sm text-white/45">Cargando clientes...</span>
      </div>
    );
  }

  const kpiCards: { label: string; value: number; icon: string; bg: string; color: string }[] = [
    { label: "Total Clientes", value: kpis.total, icon: "groups", bg: "bg-blue-500/15", color: "text-blue-400" },
    { label: "Nuevos Este Mes", value: kpis.newThisMonth, icon: "person_add", bg: "bg-emerald-500/15", color: "text-emerald-600" },
    { label: "Compradores", value: kpis.compradores, icon: "shopping_bag", bg: "bg-violet-500/15", color: "text-violet-600" },
    { label: "Vendedores", value: kpis.vendedores, icon: "storefront", bg: "bg-amber-500/15", color: "text-amber-400" },
  ];

  const roleChips: { key: RoleFilter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "comprador", label: "Comprador" },
    { key: "vendedor", label: "Vendedor" },
    { key: "ambos", label: "Ambos" },
  ];

  return (
    <>
      {/* Action button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-6 py-3 bg-violet-600/20 border border-violet-500/30 text-violet-300 rounded-full font-bold text-sm  hover:brightness-95 transition-all"
        >
          <span className="material-symbols-outlined text-lg">person_add</span> Nuevo Cliente
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0`}>
              <span className={`material-symbols-outlined text-xl ${k.color}`}>{k.icon}</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/45">{k.label}</p>
              <p className="text-2xl font-bold">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Chips */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/45">search</span>
          <input
            className="w-full pl-12 pr-6 py-3 bg-[#1a1a1d] border border-white/[0.08] rounded-xl border border-white/[0.08] focus:ring-1 focus:ring-violet-500/30 text-sm"
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {roleChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setRoleFilter(chip.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                roleFilter === chip.key
                  ? "bg-violet-600/20 border border-violet-500/30 text-violet-300"
                  : "bg-white/[0.06] text-white/55 hover:bg-white/[0.08]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content: Table + Detail Panel */}
      <div className="flex gap-6">
        {/* Table */}
        <div className={`rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 overflow-hidden transition-all ${selectedClient ? "flex-1 min-w-0" : "w-full"}`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-white/45">
              <span className="material-symbols-outlined text-4xl mb-3">people</span>
              <p className="text-sm font-medium">No hay clientes para mostrar</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.03]">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Nombre</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Teléfono</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45 hidden lg:table-cell">Email</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45">Rol</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45 hidden md:table-cell">Operaciones</th>
                    <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-white/45 hidden md:table-cell">Última Actividad</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedClient(selectedClient?.id === c.id ? null : c)}
                      className={`cursor-pointer transition-colors ${
                        selectedClient?.id === c.id
                          ? "bg-violet-500/10 border-l-2 border-l-violet-400"
                          : i % 2 === 0
                          ? "bg-white hover:bg-white/[0.03]"
                          : "bg-white/[0.02] hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-violet-400">{c.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold">{c.name}</p>
                            {c.instagram && <p className="text-[11px] text-white/45">@{c.instagram}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm">{c.phone || "—"}</td>
                      <td className="px-4 py-4 text-sm text-white/50 hidden lg:table-cell">{c.email || "—"}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${roleBadgeClasses(c.role)}`}>
                          {roleLabel(c.role)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white/45 hidden md:table-cell">0</td>
                      <td className="px-4 py-4 text-xs text-white/45 hidden md:table-cell">{timeAgo(c.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-4 bg-white/[0.03] text-xs font-medium text-white/45 border-t border-white/[0.06]">
            {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
            {roleFilter !== "todos" && <span className="ml-1">· filtro: {roleFilter}</span>}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedClient && (
          <div className="w-[360px] flex-shrink-0 hidden lg:block space-y-4">
            {/* Client Card */}
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-violet-500/15 flex items-center justify-center">
                    <span className="text-lg font-bold text-violet-400">{selectedClient.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold">{selectedClient.name}</h3>
                    <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${roleBadgeClasses(selectedClient.role)}`}>
                      {roleLabel(selectedClient.role)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-white/45 hover:text-white/80 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <div className="space-y-3">
                {selectedClient.phone && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-base text-white/45">phone</span>
                    <span className="text-sm">{selectedClient.phone}</span>
                  </div>
                )}
                {selectedClient.email && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-base text-white/45">mail</span>
                    <span className="text-sm">{selectedClient.email}</span>
                  </div>
                )}
                {selectedClient.instagram && (
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-base text-white/45">photo_camera</span>
                    <span className="text-sm">@{selectedClient.instagram}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-base text-white/45">calendar_today</span>
                  <span className="text-sm text-white/45">
                    Desde {new Date(selectedClient.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              </div>

              <button
                onClick={() => openEdit(selectedClient)}
                className="w-full mt-5 py-2.5 bg-white/[0.06] rounded-xl text-sm font-bold text-white/70 hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">edit</span> Editar
              </button>
            </div>

            {/* Notes Card */}
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 p-6">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-3">Notas</p>
              <p className="text-sm text-white/50 leading-relaxed">
                {selectedClient.notes || "Sin notas"}
              </p>
            </div>

            {/* Operation History (placeholder) */}
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] border-0 p-6">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/45 mb-3">Historial de Operaciones</p>
              <div className="flex flex-col items-center py-6 text-white/45">
                <span className="material-symbols-outlined text-3xl mb-2">receipt_long</span>
                <p className="text-xs">Sin operaciones registradas</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#1a1a1d] border border-white/[0.10] rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</h3>
              <button onClick={() => setShowModal(false)} className="text-white/45 hover:text-white/80 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Nombre *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-violet-500/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Teléfono</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-violet-500/30"
                  placeholder="+54 11 ..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-violet-500/30"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Instagram</label>
                <input
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-violet-500/30"
                  placeholder="usuario (sin @)"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest mb-2 block">Rol</label>
                <div className="flex gap-2">
                  {(["comprador", "vendedor", "ambos"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        form.role === r
                          ? "bg-violet-600/20 border border-violet-500/30 text-violet-300"
                          : "bg-white/[0.06] text-white/55 hover:bg-white/[0.08]"
                      }`}
                    >
                      {roleLabel(r)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Notas</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.03] rounded-xl border border-white/[0.08] text-sm focus:ring-1 focus:ring-violet-500/30 resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white/[0.08] rounded-full text-sm font-bold hover:bg-white/[0.10] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-violet-600/20 border border-violet-500/30 text-violet-300 rounded-full text-sm font-bold  hover:brightness-95 transition-all disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editingClient ? "Guardar Cambios" : "Crear Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
