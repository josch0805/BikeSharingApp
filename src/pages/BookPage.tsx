import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { addDays, addHours } from "date-fns";
import { useAuth } from "../auth";
import { fetchBookings, fetchResource, useLive } from "../lib/data";
import { fmtRange, toLocalInput } from "../lib/format";
import { errorText, supabase } from "../supabase";

function nextFullHour() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
}

export default function BookPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const initialStart = params.get("start") ? new Date(params.get("start")!) : nextFullHour();
  const [start, setStart] = useState(toLocalInput(initialStart));
  const [end, setEnd] = useState(toLocalInput(addHours(initialStart, 3)));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data } = useLive(async () => {
    const [resource, bookings] = await Promise.all([
      fetchResource(id!),
      fetchBookings({ resourceId: id, from: new Date() }),
    ]);
    return { resource, bookings: bookings.filter((b) => b.status === "booked") };
  }, [id]);

  const startDate = new Date(start);
  const endDate = new Date(end);

  const conflicts = useMemo(() => {
    if (!data || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return [];
    return data.bookings.filter((b) => new Date(b.starts_at) < endDate && new Date(b.ends_at) > startDate);
  }, [data, start, end]); // eslint-disable-line react-hooks/exhaustive-deps

  function setDuration(hours: number | "day") {
    const s = new Date(start);
    if (hours === "day") {
      const e = new Date(s);
      e.setHours(20, 0, 0, 0);
      if (e <= s) e.setTime(addDays(e, 1).getTime());
      setEnd(toLocalInput(e));
    } else {
      setEnd(toLocalInput(addHours(s, hours)));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return setMessage("Bitte Beginn und Ende angeben.");
    if (endDate <= startDate) return setMessage("Das Ende muss nach dem Beginn liegen.");
    if (startDate.getTime() < Date.now() - 10 * 60 * 1000) return setMessage("Der Beginn liegt in der Vergangenheit.");
    if (conflicts.length) return setMessage("Der Zeitraum überschneidet sich mit einer anderen Buchung.");
    setBusy(true);
    const { error } = await supabase.from("bookings").insert({
      resource_id: id,
      user_id: profile!.id,
      starts_at: startDate.toISOString(),
      ends_at: endDate.toISOString(),
      note: note.trim(),
    });
    setBusy(false);
    if (error) return setMessage(errorText(error));
    navigate(`/ressource/${id}`, { replace: true });
  }

  if (!data) return <div className="center muted">Lädt …</div>;

  return (
    <div className="stack">
      <header className="page-head">
        <Link to={`/ressource/${id}`} className="back">‹ {data.resource.name}</Link>
        <h1>Buchen</h1>
      </header>

      <form className="stack" onSubmit={submit}>
        <label>
          Von
          <input type="datetime-local" required value={start} min={toLocalInput(new Date())} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          Bis
          <input type="datetime-local" required value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <div className="chips">
          <button type="button" className="chip" onClick={() => setDuration(2)}>2 Std.</button>
          <button type="button" className="chip" onClick={() => setDuration(4)}>4 Std.</button>
          <button type="button" className="chip" onClick={() => setDuration("day")}>bis abends</button>
          <button type="button" className="chip" onClick={() => setDuration(24)}>24 Std.</button>
        </div>
        <label>
          Notiz (optional)
          <input value={note} placeholder="z. B. Großeinkauf" onChange={(e) => setNote(e.target.value)} />
        </label>

        {conflicts.length > 0 && (
          <div className="notice">
            <strong>Schon belegt:</strong>
            {conflicts.map((c) => (
              <div key={c.id}>
                {fmtRange(c.starts_at, c.ends_at)} – {c.profiles?.display_name}
              </div>
            ))}
          </div>
        )}
        {message && <p className="notice">{message}</p>}

        <button className="btn primary big" disabled={busy || conflicts.length > 0}>
          Verbindlich buchen
        </button>
      </form>
    </div>
  );
}
