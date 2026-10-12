import { useEffect, useState } from "react";

export type OAuthProvider = "google" | "facebook" | "apple";
type EnabledProviders = Record<OAuthProvider, boolean>;

const NONE: EnabledProviders = { google: false, facebook: false, apple: false };

let cached: EnabledProviders | null = null;

// Asks Supabase which social logins are switched on for this project, so the
// app only shows buttons that work (demo and production differ).
async function fetchEnabledProviders(): Promise<EnabledProviders> {
  if (cached) return cached;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !key) return NONE;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) return NONE;
    const json = await res.json();
    const ext = json?.external ?? {};
    cached = { google: ext.google === true, facebook: ext.facebook === true, apple: ext.apple === true };
    return cached;
  } catch {
    return NONE;
  }
}

export function useEnabledOAuthProviders(): EnabledProviders {
  const [enabled, setEnabled] = useState<EnabledProviders>(cached ?? NONE);
  useEffect(() => {
    let mounted = true;
    fetchEnabledProviders().then((value) => { if (mounted) setEnabled(value); });
    return () => { mounted = false; };
  }, []);
  return enabled;
}
