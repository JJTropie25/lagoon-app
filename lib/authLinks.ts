import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

// Handles auth links (email confirmation, password reset, OAuth return) at the
// app root. Android delivers a deep link once; if the app was already running,
// the router consumes it before the auth-callback screen could listen for it.
// Processing it here, in a component that is always mounted, avoids that race.

export type AuthLinkResult =
  | { status: "idle" }
  | { status: "processing" }
  | { status: "done"; recovery: boolean }
  | { status: "error"; message: string };

let current: AuthLinkResult = { status: "idle" };
const listeners = new Set<(r: AuthLinkResult) => void>();
const handled = new Set<string>();

function publish(next: AuthLinkResult) {
  current = next;
  listeners.forEach((fn) => fn(next));
}

function readParams(url: string) {
  const params = new URLSearchParams();
  const [beforeHash, hash = ""] = url.split("#");
  const query = beforeHash.split("?")[1] ?? "";
  for (const part of [query, hash]) {
    new URLSearchParams(part).forEach((value, key) => params.set(key, value));
  }
  return params;
}

async function processAuthUrl(url: string) {
  if (!supabase || handled.has(url)) return;
  const params = readParams(url);
  const code = params.get("code");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  const error = params.get("error_description") ?? params.get("error");
  if (!code && !accessToken && !error) return; // not an auth link

  handled.add(url);
  const recovery = params.get("type") === "recovery";
  if (error) {
    publish({ status: "error", message: error });
    return;
  }
  publish({ status: "processing" });

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.setSession({ access_token: accessToken!, refresh_token: refreshToken ?? "" });

  if (result.error) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      publish({ status: "error", message: result.error.message });
      return;
    }
  }
  publish({ status: "done", recovery });
}

/** Mount once at the app root. */
export function useAuthDeepLinks() {
  const url = Linking.useURL();
  useEffect(() => {
    if (url) processAuthUrl(url).catch((e) => publish({ status: "error", message: String(e?.message ?? e) }));
  }, [url]);
}

/** Latest auth-link outcome, for the auth-callback screen. */
export function useAuthLinkResult(): AuthLinkResult {
  const [result, setResult] = useState<AuthLinkResult>(current);
  useEffect(() => {
    listeners.add(setResult);
    setResult(current);
    return () => { listeners.delete(setResult); };
  }, []);
  return result;
}
