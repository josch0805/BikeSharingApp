import type React from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "../auth";
import BookingCard from "../components/BookingCard";
import { fetchBookings, fetchResources, useLive } from "../lib/data";
import { fmtDateTime, fmtDay } from "../lib/format";
import type { Booking, Resource } from "../types";

export default function Home() {
  const { profile } = useAuth();
  const now = new Date();

  const { data, reload } = useLive(async () => {
    const [resources, bookings] = await Promise.all([
      fetchResources(),
      fetchBookings({ from: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) }),
    ]);
    return { resources, bookings };
  }, []);

  if (!data) return <div className="center muted">Lädt …</div>;

  const open = data.bookings.filter((b) => b.status === "booked");
  const mine = open.filter((b) => b.user_id === profile?.id);

  return (
    <div className="stack">
      <header className="page-head">
        <h1>Hallo {profile?.display_name || ""} 👋</h1>
      </header>

      {mine.length > 0 && (
        <section className="stack">
          <h2>Meine Buchungen</h2>
          {mine.map((b) => (
            <BookingCard key={b.id} booking={b} showResource canManage onChanged={reload} />
          ))}
        </section>
      )}

      <section className="stack">
        <h2>Was möchtest du ausleihen?</h2>
        {data.resources.length === 0 && <p className="muted">Noch keine Ressourcen angelegt.</p>}
        {data.resources.map((r) => (
          <ResourceCard key={r.id} resource={r} bookings={open.filter((b) => b.resource_id === r.id)} now={now} />
        ))}
      </section>
    </div>
  );
}

function ResourceCard({ resource: r, bookings, now }: { resource: Resource; bookings: Booking[]; now: Date }) {
  const current = bookings.find((b) => new Date(b.starts_at) <= now);
  const next = bookings.find((b) => new Date(b.starts_at) > now);

  let status: React.ReactElement;
  if (current) {
    const overdue = new Date(current.ends_at) < now;
    status = (
      <span className={`badge ${overdue ? "red" : "orange"}`}>
        {overdue ? "nicht zurückgegeben" : `unterwegs bis ${format(new Date(current.ends_at), "HH:mm")}`}
      </span>
    );
  } else {
    status = <span className="badge green">frei</span>;
  }

  return (
    <Link to={`/ressource/${r.id}`} className="card resource-card">
      <div className="row between">
        <div>
          <div className="strong big-text">{r.name}</div>
          <div className="muted small">{r.kind}</div>
        </div>
        {status}
      </div>
      <div className="small top">
        📍 {r.current_location || <span className="muted">Standort unbekannt</span>}
      </div>
      {current && <div className="small muted">bei {current.profiles?.display_name}</div>}
      {!current && next && (
        <div className="small muted">
          Nächste Buchung: {fmtDateTime(next.starts_at)} ({next.profiles?.display_name})
        </div>
      )}
      {!current && !next && <div className="small muted">Keine Buchungen ab {fmtDay(now).toLowerCase()}</div>}
    </Link>
  );
}
