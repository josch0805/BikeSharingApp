import { format, isSameDay, isToday, isTomorrow } from "date-fns";
import { de } from "date-fns/locale";

export function fmtDay(d: Date): string {
  if (isToday(d)) return "Heute";
  if (isTomorrow(d)) return "Morgen";
  return format(d, "EEE, d. MMM", { locale: de });
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${fmtDay(d)}, ${format(d, "HH:mm")}`;
}

export function fmtRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (isSameDay(s, e)) return `${fmtDay(s)}, ${format(s, "HH:mm")}–${format(e, "HH:mm")} Uhr`;
  return `${fmtDay(s)}, ${format(s, "HH:mm")} – ${fmtDay(e)}, ${format(e, "HH:mm")} Uhr`;
}

/** Wert für <input type="datetime-local"> */
export function toLocalInput(d: Date): string {
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

export function mapLink(lat: number, lng: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
}
