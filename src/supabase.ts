import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

// Einladungs- und Passwort-Links landen mit "#...type=invite|recovery" in der URL.
// Das merken wir uns, bevor supabase-js den Hash verarbeitet und entfernt.
const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const linkType = hash.get("type");
if (linkType === "invite" || linkType === "recovery") {
  sessionStorage.setItem("needsPassword", linkType);
}
export const linkError = hash.get("error_description");

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Basis-URL der Web-App, an die Einladungslinks zurückführen. */
export const appUrl = (import.meta.env.VITE_APP_URL as string | undefined) || window.location.origin;

export function errorText(e: unknown): string {
  if (!e) return "Unbekannter Fehler";
  const err = e as { code?: string; message?: string };
  if (err.code === "23P01") return "In diesem Zeitraum ist die Ressource schon gebucht.";
  if (err.message === "Invalid login credentials") return "E-Mail oder Passwort ist falsch.";
  if (err.message?.includes("row-level security")) return "Das ist leider nicht erlaubt (Startzeit in der Vergangenheit?).";
  return err.message ?? String(e);
}
