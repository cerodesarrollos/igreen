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
    if (editingClient && selectedClient?.id === editingClient.id) {
      setSelectedClient({ ...editingClient, ...payload } as Client);
    }
  }

  /* ── loading state ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
        <span className="ml-3 text-sm text-white/45">Cargando clientes...</span>
      </div>
    );
  }

  const kpiCards = [
    { label: "Total Clientes",  value: kpis.total,        icon: "groups"        },
    { label: "Nuevos Este Mes", value: kpis.newThisMonth,  icon: "person_add"    },
    { label: "Compradores",     value: kpis.compradores,   icon: "shopping_bag"  },
    { label: "Vendedores",      value: kpis.vendedores,    icon: "storefront"    },
  ];

  const roleChips: { key: RoleFilter; label: string }[] = [
    { key: "todos",     label: "Todos"     },
    { key: "comprador", label: "Comprador" },
    { key: "vendedor",  label: "Vendedor"  },
    { key: "ambos",     label: "Ambos"     },
  ];

  return (
    <div className="px-8 py-8 overflow-y-auto flex-1">
      {/* ── KPI Cards ── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiCards.map((k) => (
          <div key={k.label} className="rounded-[18px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
            <div className="rounded-[17px] bg-[#161619] px-5 py-4 h-full shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">{k.label}</p>
                <span className="material-symbols-outlined text-[16px] text-white/15">{k.icon}</span>
              </div>
              <div className="mt-3">
                <p className="text-[28px] font-medium leading-none tracking-tight text-white/90">{k.value}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Table card ── */}
      <div className="flex gap-6">
        <div className={`rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d] transition-all ${selectedClient ? "flex-1 min-w-0" : "w-full"}`}>
          <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_32px_-8px_rgba(0,0,0,0.6)] overflow-hidden">

            {/* Header */}
            <div className="p-6 border-b border-white/[0.06]">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/35 text-[18px]">search</span>
                  <input
                    className="w-full pl-11 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-white/20 placeholder:text-white/30"
                    placeholder="Buscar por nombre, teléfono o email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {/* Chips + Add */}
                <div className="flex items-center gap-2 flex-wrap">
                  {roleChips.map((chip) => (
                    <button
                      key={chip.key}
                      onClick={() => setRoleFilter(chip.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        roleFilter === chip.key
                          ? "bg-white/[0.12] border border-white/[0.18] text-white/90"
                          : "bg-white/[0.06] text-white/45 hover:bg-white/[0.08]"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                  <button
                    onClick={openAdd}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-white/[0.08] border border-white/[0.12] text-white/75 rounded-full font-bold text-xs hover:bg-white/[0.12] transition-all ml-2"
                  >
                    <span className="material-symbols-outlined text-sm">person_add</span> Nuevo Cliente
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
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
                        className={`cursor-pointer transition-colors border-b border-white/[0.04] last:border-0 ${
                          selectedClient?.id === c.id
                            ? "bg-white/[0.06]"
                            : i % 2 === 0
                            ? "bg-transparent hover:bg-white/[0.03]"
                            : "bg-white/[0.02] hover:bg-white/[0.03]"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/[0.07] flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-white/60">{c.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-bold">{c.name}</p>
                              {c.instagram && <p className="text-[11px] text-white/45">@{c.instagram}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-white/70">{c.phone || "—"}</td>
                        <td className="px-4 py-4 text-sm text-white/50 hidden lg:table-cell">{c.email || "—"}</td>
                        <td className="px-4 py-4">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/[0.07] text-white/60 border border-white/[0.08]">
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

            {/* Footer */}
            <div className="px-6 py-3 bg-white/[0.02] text-xs font-medium text-white/35 border-t border-white/[0.06]">
              {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
              {roleFilter !== "todos" && <span className="ml-1">· filtro: {roleFilter}</span>}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedClient && (
          <div className="w-[340px] flex-shrink-0 hidden lg:flex flex-col gap-4">
            {/* Client Card */}
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
              <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/[0.07] flex items-center justify-center">
                      <span className="text-lg font-bold text-white/60">{selectedClient.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold">{selectedClient.name}</h3>
                      <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.07] text-white/55 border border-white/[0.08]">
                        {roleLabel(selectedClient.role)}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setSelectedClient(null)} className="text-white/35 hover:text-white/70 transition-colors">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {selectedClient.phone && (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-base text-white/35">phone</span>
                      <span className="text-sm text-white/75">{selectedClient.phone}</span>
                    </div>
                  )}
                  {selectedClient.email && (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-base text-white/35">mail</span>
                      <span className="text-sm text-white/75">{selectedClient.email}</span>
                    </div>
                  )}
                  {selectedClient.instagram && (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-base text-white/35">photo_camera</span>
                      <span className="text-sm text-white/75">@{selectedClient.instagram}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-base text-white/35">calendar_today</span>
                    <span className="text-sm text-white/45">
                      Desde {new Date(selectedClient.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => openEdit(selectedClient)}
                  className="w-full mt-5 py-2.5 bg-white/[0.06] rounded-xl text-sm font-bold text-white/60 hover:bg-white/[0.09] transition-colors flex items-center justify-center gap-2 border border-white/[0.08]"
                >
                  <span className="material-symbols-outlined text-base">edit</span> Editar
                </button>
              </div>
            </div>

            {/* Notes Card */}
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
              <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6">
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-3">Notas</p>
                <p className="text-sm text-white/50 leading-relaxed">
                  {selectedClient.notes || "Sin notas"}
                </p>
              </div>
            </div>

            {/* Operation History */}
            <div className="rounded-[20px] p-px bg-gradient-to-b from-[#2a2a2e] to-[#1a1a1d]">
              <div className="rounded-[19px] bg-[#161619] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] p-6">
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/35 mb-3">Historial de Operaciones</p>
                <div className="flex flex-col items-center py-6 text-white/30">
                  <span className="material-symbols-outlined text-3xl mb-2">receipt_long</span>
                  <p className="text-xs">Sin operaciones registradas</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-[#161619] border border-white/[0.10] rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</h3>
              <button onClick={() => setShowModal(false)} className="text-white/35 hover:text-white/70 transition-colors">
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
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] rounded-xl border border-white/[0.08] text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Teléfono</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] rounded-xl border border-white/[0.08] text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                  placeholder="+54 11 ..."
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] rounded-xl border border-white/[0.08] text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/45 uppercase tracking-widest">Instagram</label>
                <input
                  value={form.instagram}
                  onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] rounded-xl border border-white/[0.08] text-sm focus:outline-none focus:ring-1 focus:ring-white/20"
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
                          ? "bg-white/[0.12] border border-white/[0.18] text-white/90"
                          : "bg-white/[0.06] text-white/45 hover:bg-white/[0.08]"
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
                  className="w-full mt-1 px-4 py-2.5 bg-white/[0.04] rounded-xl border border-white/[0.08] text-sm focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-white/[0.06] rounded-full text-sm font-bold text-white/60 hover:bg-white/[0.09] transition-colors border border-white/[0.08]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-white/[0.10] border border-white/[0.16] text-white/85 rounded-full text-sm font-bold hover:bg-white/[0.13] transition-all disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editingClient ? "Guardar Cambios" : "Crear Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
