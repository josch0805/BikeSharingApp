import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { Profile } from "./types";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  needsPassword: boolean;
  passwordSet: () => void;
  markNeedsPassword: () => void;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPassword, setNeedsPassword] = useState(!!sessionStorage.getItem("needsPassword"));

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile((data as Profile) ?? null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("needsPassword", "recovery");
        setNeedsPassword(true);
      }
      setSession(s);
      // außerhalb des Callbacks laden (vermeidet Deadlocks in supabase-js)
      setTimeout(() => loadProfile(s?.user.id), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const passwordSet = () => {
    sessionStorage.removeItem("needsPassword");
    setNeedsPassword(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        profile,
        loading,
        needsPassword,
        passwordSet,
        markNeedsPassword: () => setNeedsPassword(true),
        reloadProfile: () => loadProfile(session?.user.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth außerhalb von AuthProvider");
  return ctx;
}
