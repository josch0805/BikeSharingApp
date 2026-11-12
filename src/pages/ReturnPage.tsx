import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchBooking, fetchRecentLocations } from "../lib/data";
import { fmtRange, mapLink } from "../lib/format";
import { errorText, supabase } from "../supabase";
import type { Booking } from "../types";

export default function ReturnPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBooking(id!).then(setBooking).catch((e) => setMessage(errorText(e)));
    fetchRecentLocations().then(setSuggestions);
  }, [id]);

  function useGps() {
    if (!navigator.geolocation) return setMessage("Standortbestimmung wird nicht unterstützt.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setMessage("Standort konnte nicht ermittelt werden. Bitte Freigabe prüfen.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!location.trim()) return setMessage("Bitte beschreibe, wo die Ressource jetzt steht.");
    setBusy(true);
    const { error } = await supabase.rpc("return_booking", {
      p_booking_id: id,
      p_location: location.trim(),
      p_lat: coords?.lat ?? null,
      p_lng: coords?.lng ?? null,
    });
    setBusy(false);
    if (error) return setMessage(errorText(error));
    navigate("/", { replace: true });
  }

  if (!booking) return <div className="center muted">{message ?? "Lädt …"}</div>;

  return (
    <div className="stack">
      <header className="page-head">
        <Link to="/" className="back">‹ Übersicht</Link>
        <h1>{booking.resources?.name} zurückgeben</h1>
        <p className="muted">{fmtRange(booking.starts_at, booking.ends_at)}</p>
      </header>

      <form className="stack" onSubmit={submit}>
        <label>
          Wo steht es jetzt?
          <input
            required
            value={location}
            placeholder="z. B. Hinterhof Musterstraße 5, Fahrradkeller"
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        {suggestions.length > 0 && (
          <div className="chips">
            {suggestions.map((s) => (
              <button type="button" key={s} className={`chip ${s === location ? "active" : ""}`} onClick={() => setLocation(s)}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="card">
          {coords ? (
            <div className="row between">
              <span className="small">
                ✅ GPS-Position gespeichert ·{" "}
                <a href={mapLink(coords.lat, coords.lng)} target="_blank" rel="noreferrer">Karte</a>
              </span>
              <button type="button" className="btn link" onClick={() => setCoords(null)}>entfernen</button>
            </div>
          ) : (
            <button type="button" className="btn secondary" onClick={useGps} disabled={locating}>
              {locating ? "Ermittle Position …" : "📍 Aktuelle GPS-Position mitspeichern (optional)"}
            </button>
          )}
        </div>

        {message && <p className="notice">{message}</p>}
        <button className="btn primary big" disabled={busy}>
          Rückgabe bestätigen
        </button>
      </form>
    </div>
  );
}
