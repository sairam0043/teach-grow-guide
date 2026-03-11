import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "student" | "tutor";

type AppUser = {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
};

interface AuthContextType {
  user: AppUser | null;
  session: unknown | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, meta: Record<string, string>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<unknown | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const useSupabaseAuth = useMemo(() => import.meta.env.VITE_USE_SUPABASE !== "false", []);

  const DEMO_STORAGE_KEY = "demo_auth";
  const demoAccounts: Array<{ email: string; password: string; role: AppRole; full_name: string }> = [
    { email: "admin.demo@teachgrow.local", password: "TempPass123!", role: "admin", full_name: "Demo Admin" },
    { email: "student.demo@teachgrow.local", password: "TempPass123!", role: "student", full_name: "Demo Student" },
    { email: "tutor.demo@teachgrow.local", password: "TempPass123!", role: "tutor", full_name: "Demo Tutor" },
  ];

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    return (data?.role as AppRole) ?? null;
  };

  useEffect(() => {
    if (useSupabaseAuth) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, s) => {
        setSession(s);
        const u = s?.user
          ? ({ id: s.user.id, email: s.user.email ?? "", user_metadata: (s.user.user_metadata ?? {}) as Record<string, unknown> } satisfies AppUser)
          : null;
        setUser(u);
        if (s?.user) {
          const userRole = await fetchRole(s.user.id);
          setRole(userRole);
        } else {
          setRole(null);
        }
        setLoading(false);
      });

      supabase.auth.getSession().then(async ({ data: { session: s } }) => {
        setSession(s);
        const u = s?.user
          ? ({ id: s.user.id, email: s.user.email ?? "", user_metadata: (s.user.user_metadata ?? {}) as Record<string, unknown> } satisfies AppUser)
          : null;
        setUser(u);
        if (s?.user) {
          const userRole = await fetchRole(s.user.id);
          setRole(userRole);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    }

    // Demo mode: load from localStorage
    try {
      const raw = localStorage.getItem(DEMO_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { email: string; role: AppRole; full_name: string };
        setUser({ id: `demo:${parsed.role}`, email: parsed.email, user_metadata: { full_name: parsed.full_name } });
        setRole(parsed.role);
        setSession({ demo: true });
      }
    } catch {
      // ignore
    }
    setLoading(false);
    return;
  }, [useSupabaseAuth]);

  const signUp = async (email: string, password: string, meta: Record<string, string>) => {
    if (!useSupabaseAuth) {
      return { error: new Error("Sign up is disabled in demo mode.") };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: meta,
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    if (!useSupabaseAuth) {
      const match = demoAccounts.find((a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
      if (!match) return { error: new Error("Invalid login credentials") };
      const demo = { email: match.email, role: match.role, full_name: match.full_name };
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demo));
      setUser({ id: `demo:${match.role}`, email: match.email, user_metadata: { full_name: match.full_name } });
      setRole(match.role);
      setSession({ demo: true });
      return { error: null };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    if (useSupabaseAuth) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    }
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
