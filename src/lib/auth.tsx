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
    // Escuchar cambios de sesión primero
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const iu = await fetchIgUser(session.user.id);
        setIgUser(iu);
      } else {
        setIgUser(null);
      }
      setLoading(false);
    });

    // Luego intentar obtener sesión existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      // onAuthStateChange ya maneja el estado, pero si no disparó aún:
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    }).catch(() => {
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
