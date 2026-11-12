import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addMonths, endOfMonth, format, startOfDay, startOfMonth } from "date-fns";
import { useAuth } from "../auth";
import BookingCard from "../components/BookingCard";
import MonthCalendar, { bookingsOnDay } from "../components/MonthCalendar";
import { fetchBookings, fetchResource, useLive } from "../lib/data";
import { de } from "date-fns/locale";
import { fmtDateTime, mapLink, toLocalInput } from "../lib/format";

export default function ResourceDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selected, setSelected] = useState(startOfDay(new Date()));

  const { data, reload } = useLive(async () => {
    const [resource, bookings] = await Promise.all([
      fetchResource(id!),
      fetchBookings({ resourceId: id, from: addMonths(month, -1), to: endOfMonth(addMonths(month, 1)) }),
    ]);
    return { resource, bookings };
  }, [id, month.getTime()]);

  if (!data) return <div className="center muted">Lädt …</div>;
  const { resource: r, bookings } = data;
  const isAdmin = profile?.role === "admin";
  const dayList = bookingsOnDay(bookings, selected);
  const now = new Date();
  const upcoming = bookings.filter((b) => b.status === "booked" && new Date(b.ends_at) >= now).slice(0, 10);

  function bookOnSelected() {
    // Vorschlag: gewählter Tag, 9 Uhr (bzw. nächste volle Stunde, wenn heute)
    const start = new Date(selected);
    if (startOfDay(selected).getTime() === startOfDay(now).getTime()) {
      start.setHours(now.getHours() + 1, 0, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
    }
    navigate(`/ressource/${r.id}/buchen?start=${encodeURIComponent(toLocalInput(start))}`);
  }

  return (
    <div className="stack">
      <header className="page-head">
        <Link to="/" className="back">‹ Übersicht</Link>
        <h1>{r.name}</h1>
        {r.description && <p className="muted">{r.description}</p>}
      </header>

      <div className="card">
        <div className="small muted">Aktueller Standort</div>
        <div className="strong">📍 {r.current_location || "unbekannt"}</div>
        {r.location_updated_at && (
          <div className="small muted">zuletzt aktualisiert: {fmtDateTime(r.location_updated_at)}</div>
        )}
        {r.current_lat != null && r.current_lng != null && (
          <a className="small" href={mapLink(r.current_lat, r.current_lng)} target="_blank" rel="noreferrer">
            Auf Karte anzeigen
          </a>
        )}
      </div>

      {!r.active && <p className="notice">Diese Ressource ist derzeit deaktiviert und kann nicht gebucht werden.</p>}

      <MonthCalendar
        month={month}
        onMonthChange={setMonth}
        bookings={bookings.filter((b) => b.status !== "cancelled")}
        selected={selected}
        onSelect={setSelected}
        myUserId={profile?.id}
      />

      <section className="stack">
        <h2>{format(selected, "EEEE, d. MMMM", { locale: de })}</h2>
        {dayList.length === 0 ? (
          <p className="muted">An diesem Tag ist noch nichts gebucht.</p>
        ) : (
          dayList.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              canManage={b.user_id === profile?.id || isAdmin}
              onChanged={reload}
            />
          ))
        )}
        {r.active && selected >= startOfDay(now) && (
          <button className="btn primary big" onClick={bookOnSelected}>
            {r.name} buchen
          </button>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className="stack">
          <h2>Nächste Buchungen</h2>
          {upcoming.map((b) => (
            <BookingCard key={b.id} booking={b} canManage={b.user_id === profile?.id || isAdmin} onChanged={reload} />
          ))}
        </section>
      )}
    </div>
  );
}
