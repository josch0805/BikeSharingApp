import { useState, type FormEvent } from "react";
import { appUrl, errorText, linkError, supabase } from "../supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    linkError ? `Der Link ist ungültig oder abgelaufen. Bitte neuen Link anfordern. (${linkError})` : null,
  );
  const [mode, setMode] = useState<"login" | "forgot">("login");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setMessage(errorText(error));
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: appUrl });
      setMessage(error ? errorText(error) : "Falls die Adresse bekannt ist, kommt gleich eine E-Mail mit einem Link.");
    }
    setBusy(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/icon.svg" alt="" className="auth-logo" />
        <h1>Lastenrad teilen</h1>
        <p className="muted">
          {mode === "login"
            ? "Melde dich mit deiner E-Mail und deinem Passwort an."
            : "Gib deine E-Mail ein. Du bekommst einen Link, um ein neues Passwort zu setzen."}
        </p>
        <form onSubmit={submit} className="stack">
          <label>
            E-Mail
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {mode === "login" && (
            <label>
              Passwort
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          )}
          {message && <p className="notice">{message}</p>}
          <button className="btn primary big" disabled={busy}>
            {mode === "login" ? "Anmelden" : "Link senden"}
          </button>
        </form>
        <button className="btn link" onClick={() => setMode(mode === "login" ? "forgot" : "login")}>
          {mode === "login" ? "Passwort vergessen?" : "Zurück zur Anmeldung"}
        </button>
        <p className="muted small">Kein Zugang? Ein Admin muss dich einladen.</p>
      </div>
    </div>
  );
}
