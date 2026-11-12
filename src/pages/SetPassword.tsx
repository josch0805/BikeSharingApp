import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { errorText, supabase } from "../supabase";

export default function SetPassword() {
  const { profile, passwordSet, reloadProfile } = useAuth();
  const isInvite = sessionStorage.getItem("needsPassword") === "invite";
  const [name, setName] = useState(profile?.display_name ?? "");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setMessage("Das Passwort muss mindestens 8 Zeichen haben.");
    if (pw !== pw2) return setMessage("Die Passwörter stimmen nicht überein.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      return setMessage(errorText(error));
    }
    if (profile && name.trim() && name.trim() !== profile.display_name) {
      await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", profile.id);
      await reloadProfile();
    }
    passwordSet();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/icon.svg" alt="" className="auth-logo" />
        <h1>{isInvite ? "Willkommen!" : "Neues Passwort"}</h1>
        <p className="muted">
          {isInvite
            ? "Du wurdest eingeladen. Lege jetzt deinen Namen und dein Passwort fest."
            : "Lege ein neues Passwort fest."}
        </p>
        <form onSubmit={submit} className="stack">
          {isInvite && (
            <label>
              Dein Name (sehen die anderen im Kalender)
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label>
            Passwort (mind. 8 Zeichen)
            <input type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} />
          </label>
          <label>
            Passwort wiederholen
            <input type="password" autoComplete="new-password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </label>
          {message && <p className="notice">{message}</p>}
          <button className="btn primary big" disabled={busy}>
            Speichern und loslegen
          </button>
        </form>
      </div>
    </div>
  );
}
