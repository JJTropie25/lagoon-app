import { useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export function useAuthState(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!supabase) {
      setLoading(false);
      return;
    }

    const ensureProfile = async (nextUser: User | null) => {
      if (!supabase || !nextUser) return;
      // Keep public.profiles aligned with auth.users so host FK constraints never fail.
      const username =
        (nextUser.user_metadata?.username as string | undefined) ??
        (nextUser.user_metadata?.name as string | undefined) ??
        (nextUser.email?.split("@")[0] ?? null);
      await supabase.from("profiles").upsert(
        {
          id: nextUser.id,
          username,
        },
        { onConflict: "id" }
      );
    };

    const hydrateSession = async () => {
      // Hydrate once at boot so screens can render immediately with cached auth state.
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      await ensureProfile(data.session?.user ?? null);
      setLoading(false);
    };

    hydrateSession().catch(() => {
      if (!isMounted) return;
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        ensureProfile(nextSession?.user ?? null).catch(() => null);
      }
    );

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  return useMemo(
    () => ({ session, user, loading }),
    [session, user, loading]
  );
}
