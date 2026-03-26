"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim(),
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim()
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data.session) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }

    // Force full page reload so middleware picks up the new cookie
    window.location.href = "/ventas/stock";
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080809" }}>
      <div className="w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ background: "#3eff8e", boxShadow: "0 0 32px rgba(62,255,142,0.3)" }}
          >
            <span className="text-black font-black text-lg">iG</span>
          </div>
          <h1 className="text-xl font-semibold text-white/90">iGreen</h1>
          <p className="text-sm text-white/35 mt-1">Sistema de gestión</p>
        </div>

        {/* Card */}
        <div className="rounded-[20px] p-px" style={{ background: "linear-gradient(to bottom, #2a2a2e, #1a1a1d)" }}>
          <div
            className="rounded-[19px] p-6"
            style={{ background: "#161619", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}
          >
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-white/45 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white/80 border border-white/[0.08] outline-none focus:border-white/20 transition-colors"
                  style={{ background: "#1e1e22" }}
                  placeholder="nombre@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-xs text-white/45 mb-1.5">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-white/80 border border-white/[0.08] outline-none focus:border-white/20 transition-colors"
                  style={{ background: "#1e1e22" }}
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400/80 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.70)" }}
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          iGreen · Premium Reseller
        </p>
      </div>
    </div>
  );
}
