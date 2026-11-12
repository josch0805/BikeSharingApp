import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { fmtRange } from "../lib/format";
import { isOverdue, isRunning } from "../lib/data";
import { errorText, supabase } from "../supabase";
import type { Booking } from "../types";

interface Props {
  booking: Booking;
  showResource?: boolean;
  canManage: boolean;
  onChanged?: () => void;
}

export default function BookingCard({ booking: b, showResource, canManage, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const running = isRunning(b);
  const overdue = isOverdue(b);

  async function cancel() {
    if (!confirm("Buchung wirklich stornieren?")) return;
    setBusy(true);
    const { error } = await supabase.rpc("cancel_booking", { p_booking_id: b.id });
    setBusy(false);
    if (error) alert(errorText(error));
    else onChanged?.();
  }

  let badge: React.ReactElement | null = null;
  if (b.status === "returned") badge = <span className="badge grey">zurückgegeben</span>;
  else if (overdue) badge = <span className="badge red">Rückgabe offen</span>;
  else if (running) badge = <span className="badge green">läuft</span>;

  return (
    <div className={`card booking ${overdue ? "overdue" : ""}`}>
      <div className="row between">
        <div>
          {showResource && <div className="strong">{b.resources?.name}</div>}
          <div className={showResource ? "" : "strong"}>{fmtRange(b.starts_at, b.ends_at)}</div>
          <div className="muted small">
            {b.profiles?.display_name || "Unbekannt"}
            {b.note ? ` · ${b.note}` : ""}
          </div>
          {b.status === "returned" && b.return_location && (
            <div className="muted small">📍 {b.return_location}</div>
          )}
        </div>
        {badge}
      </div>
      {canManage && b.status === "booked" && (
        <div className="row gap top">
          {running ? (
            <Link to={`/buchung/${b.id}/rueckgabe`} className="btn primary grow">
              Zurückgeben
            </Link>
          ) : (
            <button className="btn danger-outline grow" onClick={cancel} disabled={busy}>
              Stornieren
            </button>
          )}
        </div>
      )}
    </div>
  );
}
