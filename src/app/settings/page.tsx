"use client";

import { useState, useEffect } from "react";
import { useAuth, IgUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { igUser, role } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<IgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "vendedor">("vendedor");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Redirect non-admins
  useEffect(() => {
    if (role && role !== "admin") {
      router.push("/ventas/stock");
    }
  }, [role, router]);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data } = await supabase.from("ig_users").select("*").order("created_at");
    setUsers((data as IgUser[]) || []);
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviting(true);

    try {
      // Create auth user via admin API — we use service role via our API route
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          password: invitePassword,
          name: inviteName.trim(),
          role: inviteRole,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setInviteError(result.error || "Error al crear usuario");
      } else {
        setInviteSuccess(`Usuario ${inviteEmail} creado exitosamente`);
        setInviteEmail("");
        setInviteName("");
        setInvitePassword("");
        setInviteRole("vendedor");
        fetchUsers();
      }
    } catch {
      setInviteError("Error de conexión");
    }

    setInviting(false);
  }

  async function toggleActive(user: IgUser) {
    await supabase.from("ig_users").update({ active: !user.active }).eq("id", user.id);
    fetchUsers();
  }

  async function changeRole(user: IgUser, newRole: "admin" | "vendedor") {
    await supabase.from("ig_users").update({ role: newRole }).eq("id", user.id);
    fetchUsers();
  }

  if (role !== "admin") return null;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-white/85">Configuración</h1>
        <p className="text-sm text-white/35 mt-0.5">Gestión de usuarios y accesos</p>
      </div>

      {/* Usuarios actuales */}
      <div className="rounded-[20px] p-px" style={{ background: "linear-gradient(to bottom, #2a2a2e, #1a1a1d)" }}>
        <div className="rounded-[19px] p-5" style={{ background: "#161619", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[16px] text-white/15">group</span>
            <h2 className="text-sm font-semibold text-white/70">Usuarios</h2>
          </div>

          {loading ? (
            <p className="text-sm text-white/35">Cargando...</p>
          ) : (
            <div className="space-y-2">
              {users.map(user => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.05]"
                  style={{ background: "#1a1a1d" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-white/[0.07] flex items-center justify-center text-xs font-semibold text-white/50 shrink-0">
                      {(user.name || user.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white/75 truncate">{user.name || "—"}</p>
                      <p className="text-xs text-white/35 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Role selector */}
                    {user.auth_id !== igUser?.auth_id && (
                      <select
                        value={user.role}
                        onChange={(e) => changeRole(user, e.target.value as "admin" | "vendedor")}
                        className="text-xs rounded-lg px-2 py-1 border border-white/[0.08] text-white/55 outline-none"
                        style={{ background: "#1e1e22" }}
                      >
                        <option value="admin">Admin</option>
                        <option value="vendedor">Vendedor</option>
                      </select>
                    )}
                    {user.auth_id === igUser?.auth_id && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.07] text-white/50 uppercase">
                        {user.role}
                      </span>
                    )}

                    {/* Active toggle */}
                    {user.auth_id !== igUser?.auth_id && (
                      <button
                        onClick={() => toggleActive(user)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-colors ${
                          user.active
                            ? "bg-white/[0.07] text-white/50"
                            : "bg-red-500/10 text-red-400/60"
                        }`}
                      >
                        {user.active ? "Activo" : "Inactivo"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invitar usuario */}
      <div className="rounded-[20px] p-px" style={{ background: "linear-gradient(to bottom, #2a2a2e, #1a1a1d)" }}>
        <div className="rounded-[19px] p-5" style={{ background: "#161619", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-[16px] text-white/15">person_add</span>
            <h2 className="text-sm font-semibold text-white/70">Agregar usuario</h2>
          </div>

          <form onSubmit={handleInvite} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/40 mb-1">Nombre</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                  className="w-full rounded-lg px-3 py-2 text-sm text-white/75 border border-white/[0.08] outline-none focus:border-white/20 transition-colors"
                  style={{ background: "#1e1e22" }}
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1">Rol</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "admin" | "vendedor")}
                  className="w-full rounded-lg px-3 py-2 text-sm text-white/75 border border-white/[0.08] outline-none focus:border-white/20 transition-colors"
                  style={{ background: "#1e1e22" }}
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2 text-sm text-white/75 border border-white/[0.08] outline-none focus:border-white/20 transition-colors"
                style={{ background: "#1e1e22" }}
                placeholder="email@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-xs text-white/40 mb-1">Contraseña inicial</label>
              <input
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg px-3 py-2 text-sm text-white/75 border border-white/[0.08] outline-none focus:border-white/20 transition-colors"
                style={{ background: "#1e1e22" }}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {inviteError && <p className="text-xs text-red-400/80">{inviteError}</p>}
            {inviteSuccess && <p className="text-xs text-green-400/70">{inviteSuccess}</p>}

            <button
              type="submit"
              disabled={inviting}
              className="rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.70)" }}
            >
              {inviting ? "Creando..." : "Crear usuario"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
