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
      return data as IgUser | null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    let settled = false;

    function settle() {
      if (!settled) {
        settled = true;
        setLoading(false);
      }
    }

    // Timeout de seguridad: si en 4 segundos no resolvió, forzamos loading=false
    const timeout = setTimeout(settle, 4000);

    // getSession() lee desde localStorage inmediatamente si el token es válido.
    // No espera red — es la forma más rápida de saber el estado inicial.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const iu = await fetchIgUser(session.user.id);
        setIgUser(iu);
      } else {
        setIgUser(null);
      }
      settle();
    }).catch(() => settle());

    // onAuthStateChange maneja cambios posteriores (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const iu = await fetchIgUser(session.user.id);
        setIgUser(iu);
      } else {
        setIgUser(null);
      }
      settle();
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
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
