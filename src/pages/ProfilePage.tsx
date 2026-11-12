import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { errorText, supabase } from "../supabase";

export default function ProfilePage() {
  const { profile, reloadProfile } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? "");
  const [pw, setPw] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", profile!.id);
    setMessage(error ? errorText(error) : "Name gespeichert.");
    await reloadProfile();
  }

  async function savePw(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return setMessage("Das Passwort muss mindestens 8 Zeichen haben.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    setMessage(error ? errorText(error) : "Passwort geändert.");
    setPw("");
  }

  return (
    <div className="stack">
      <header className="page-head">
        <h1>Profil</h1>
        <p className="muted">
          {profile?.email} · {profile?.role === "admin" ? "Admin" : "Mitglied"}
        </p>
      </header>

      {message && <p className="notice">{message}</p>}

      <form className="card stack" onSubmit={saveName}>
        <label>
          Anzeigename
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <button className="btn secondary">Name speichern</button>
      </form>

      <form className="card stack" onSubmit={savePw}>
        <label>
          Neues Passwort
          <input type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </label>
        <button className="btn secondary">Passwort ändern</button>
      </form>

      <button className="btn danger-outline big" onClick={() => supabase.auth.signOut()}>
        Abmelden
      </button>
    </div>
  );
}
