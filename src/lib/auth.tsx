"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

export type UserRole = "admin" | "vendedor";

export interface IgUser {
  id: string;
  auth_id: string;
  email: string;
  name: string | null;
  role: UserRole;
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  igUser: IgUser | null;
  role: UserRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  igUser: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [igUser, setIgUser] = useState<IgUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchIgUser(authId: string) {
    try {
      const { data } = await supabase
        .from("ig_users")
        .select("*")
        .eq("auth_id", authId)
        .single();
      if (data) setIgUser(data as IgUser);
    } catch {
      // silencioso — igUser queda null
    }
  }

  useEffect(() => {
    // Intentar leer sesión de localStorage directamente (sin red)
    // El key de Supabase vanilla es sb-<ref>-auth-token
    try {
      const raw = localStorage.getItem("sb-iglfukxthrmprnqergbz-auth-token");
      if (raw) {
        const stored = JSON.parse(raw);
        const sessionUser = stored?.user ?? null;
        const expiresAt = stored?.expires_at ?? 0;
        if (sessionUser && expiresAt > Date.now() / 1000) {
          // Sesión válida en localStorage — no necesitamos red para mostrar el shell
          setUser(sessionUser);
          setLoading(false);
          // Fetch igUser en background, sin bloquear
          fetchIgUser(sessionUser.id);
          return;
        }
      }
    } catch {
      // localStorage no disponible o JSON inválido
    }

    // Sin sesión en localStorage → loading=false inmediato, ir a login
    setLoading(false);

    // onAuthStateChange maneja login/logout y token refresh posterior
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setIgUser(null);
      } else {
        fetchIgUser(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIgUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, igUser, role: igUser?.role ?? null, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
