"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  notes: "",
};

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("ig_clients").select("*").order("name");
    setClients((data || []) as Client[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = clients.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || (c.email && c.email.toLowerCase().includes(q));
  });

  function openAdd() {
    setEditingClient(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(client: Client) {
    setEditingClient(client);
    setForm({
      name: client.name,
      phone: client.phone,
      email: client.email || "",
      notes: client.notes || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email || null,
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
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-3 text-sm text-cool-grey">Cargando clientes...</span>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
          <p className="text-on-surface-variant text-sm mt-1">Base de datos de clientes del módulo de ventas</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full font-bold text-sm shadow-md shadow-primary/20"
        >
          <span className="material-symbols-outlined text-lg">person_add</span> Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-cool-grey">search</span>
          <input
            className="w-full pl-12 pr-6 py-3 bg-white rounded-xl border border-slate-200 focus:ring-1 focus:ring-primary/30 text-sm"
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-cool-grey">
            <span className="material-symbols-outlined text-4xl mb-3">people</span>
            <p className="text-sm font-medium">No hay clientes para mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Nombre</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Teléfono</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Email</th>
                  <th className="px-4 py-4 text-[10px] uppercase tracking-widest font-bold text-cool-grey">Registrado</th>
                  <th className="px-4 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-primary">{c.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-bold">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">{c.phone}</td>
                    <td className="px-4 py-4 text-sm text-on-surface-variant">{c.email || "—"}</td>
                    <td className="px-4 py-4 text-xs text-cool-grey">
                      {new Date(c.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button onClick={() => openEdit(c)} className="text-cool-grey hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 bg-slate-50 text-xs font-medium text-cool-grey border-t border-slate-100">
          {filtered.length} cliente{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold">{editingClient ? "Editar Cliente" : "Nuevo Cliente"}</h3>
              <button onClick={() => setShowModal(false)} className="text-cool-grey hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Nombre *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Teléfono *</label>
                <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30"
                  placeholder="+54 11 ..." />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30" />
              </div>
              <div>
                <label className="text-xs font-bold text-cool-grey uppercase tracking-widest">Notas</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full mt-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:ring-1 focus:ring-primary/30 resize-none"
                  rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-slate-200 rounded-full text-sm font-bold hover:bg-slate-300 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-primary text-white rounded-full text-sm font-bold shadow-md shadow-primary/20 hover:brightness-95 transition-all disabled:opacity-50">
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
