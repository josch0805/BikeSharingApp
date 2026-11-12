import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { Booking, Resource } from "../types";

const BOOKING_SELECT = "*, profiles(display_name), resources(name)";

/** Lädt Daten und lädt automatisch neu, wenn sich Buchungen/Ressourcen ändern. */
export function useLive<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(loader, deps);

  const reload = useCallback(async () => {
    try {
      setData(await load());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [load]);

  useEffect(() => {
    reload();
    const channel = supabase
      .channel(`live-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "resources" }, () => reload())
      .subscribe();
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [reload]);

  return { data, error, reload };
}

export async function fetchResources(includeInactive = false): Promise<Resource[]> {
  let q = supabase.from("resources").select("*").order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data as Resource[];
}

export async function fetchResource(id: string): Promise<Resource> {
  const { data, error } = await supabase.from("resources").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Resource;
}

/** Aktive (nicht stornierte, nicht zurückgegebene) und künftige Buchungen ab einem Zeitpunkt */
export async function fetchBookings(opts: { resourceId?: string; userId?: string; from?: Date; to?: Date }) {
  let q = supabase
    .from("bookings")
    .select(BOOKING_SELECT)
    .neq("status", "cancelled")
    .order("starts_at");
  if (opts.resourceId) q = q.eq("resource_id", opts.resourceId);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  if (opts.from) q = q.gte("ends_at", opts.from.toISOString());
  if (opts.to) q = q.lte("starts_at", opts.to.toISOString());
  const { data, error } = await q;
  if (error) throw error;
  return data as Booking[];
}

export async function fetchBooking(id: string): Promise<Booking> {
  const { data, error } = await supabase.from("bookings").select(BOOKING_SELECT).eq("id", id).single();
  if (error) throw error;
  return data as Booking;
}

/** Zuletzt verwendete Rückgabe-Standorte als Vorschläge */
export async function fetchRecentLocations(): Promise<string[]> {
  const { data } = await supabase
    .from("bookings")
    .select("return_location")
    .not("return_location", "is", null)
    .order("returned_at", { ascending: false })
    .limit(50);
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const loc = (row as { return_location: string }).return_location;
    if (loc && !seen.has(loc)) seen.add(loc);
  }
  return [...seen].slice(0, 8);
}

/** Läuft gerade (begonnen, nicht zurückgegeben) */
export function isRunning(b: Booking, now = new Date()) {
  return b.status === "booked" && new Date(b.starts_at) <= now;
}

export function isOverdue(b: Booking, now = new Date()) {
  return b.status === "booked" && new Date(b.ends_at) < now;
}
