import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { fetchResources, useLive } from "../lib/data";
import { fmtDateTime } from "../lib/format";
import { appUrl, errorText, supabase } from "../supabase";
import type { Resource, Role } from "../types";

interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: Role;
  last_sign_in_at: string | null;
  invited_at: string | null;
}

async function callAdmin<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-users", { body: { ...body, redirectTo: appUrl } });
  if (error) {
    // Fehlermeldung aus dem Funktions-Body holen
    const ctx = (error as { context?: Response }).context;
    if (ctx?.json) {
      const j = await ctx.json().catch(() => null);
      if (j?.error) throw new Error(j.error);
    }
    throw error;
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export default function Admin() {
  const [tab, setTab] = useState<"users" | "resources">("users");
  return (
    <div className="stack">
      <header className="page-head">
        <h1>Verwaltung</h1>
      </header>
      <div className="segmented">
        <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}>Personen</button>
        <button className={tab === "resources" ? "active" : ""} onClick={() => setTab("resources")}>Ressourcen</button>
      </div>
      {tab === "users" ? <Users /> : <Resources />}
    </div>
  );
}

// ------------------------------------------------------------------ Personen
function Users() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await callAdmin<{ users: AdminUser[] }>({ action: "list" });
      setUsers(res.users.sort((a, b) => (a.display_name || a.email).localeCompare(b.display_name || b.email)));
    } catch (e) {
      setMessage(errorText(e));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(e: FormEvent, mode: "invite" | "invite_link") {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    setLink(null);
    try {
      if (mode === "invite") {
        await callAdmin({ action: "invite", email, displayName: name });
        setMessage(`Einladung an ${email} wurde per E-Mail verschickt.`);
      } else {
        const res = await callAdmin<{ link: string }>({ action: "invite_link", email, displayName: name });
        setLink(res.link);
        setMessage(`Einladungslink für ${email} erstellt. Schicke ihn der Person (z. B. per Messenger).`);
      }
      setEmail("");
      setName("");
      await load();
    } catch (err) {
      setMessage(errorText(err));
    }
    setBusy(false);
  }

  async function newLink(u: AdminUser) {
    setMessage(null);
    try {
      const res = await callAdmin<{ link: string }>({ action: "invite_link", email: u.email });
      setLink(res.link);
      setMessage(`Neuer Anmeldelink für ${u.display_name || u.email}:`);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setMessage(errorText(err));
    }
  }

  async function toggleRole(u: AdminUser) {
    const role = u.role === "admin" ? "member" : "admin";
    const { error } = await supabase.rpc("set_user_role", { p_user_id: u.id, p_role: role });
    if (error) return alert(errorText(error));
    load();
  }

  async function remove(u: AdminUser) {
    if (!confirm(`${u.display_name || u.email} wirklich entfernen? Die Buchungen dieser Person werden ebenfalls gelöscht.`)) return;
    try {
      await callAdmin({ action: "delete", userId: u.id });
      load();
    } catch (err) {
      alert(errorText(err));
    }
  }

  async function share() {
    if (!link) return;
    if (navigator.share) {
      await navigator.share({ title: "Einladung Lastenrad", text: "Hier ist deine Einladung zur Lastenrad-App:", url: link }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(link);
      alert("Link kopiert");
    }
  }

  return (
    <div className="stack">
      <form className="card stack" onSubmit={(e) => invite(e, "invite_link")}>
        <h2>Person einladen</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Anna" />
        </label>
        <label>
          E-Mail
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button className="btn primary" disabled={busy}>Einladungslink erstellen</button>
        <button type="button" className="btn secondary" disabled={busy || !email} onClick={(e) => invite(e, "invite")}>
          Einladung per E-Mail senden
        </button>
      </form>

      {message && <p className="notice">{message}</p>}
      {link && (
        <div className="card stack">
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
          <button className="btn primary" onClick={share}>Link teilen / kopieren</button>
          <p className="small muted">Der Link ist nur einmal gültig und läuft nach 24 Stunden ab.</p>
        </div>
      )}

      <h2>Personen ({users?.length ?? "…"})</h2>
      {users?.map((u) => (
        <div key={u.id} className="card">
          <div className="row between">
            <div>
              <div className="strong">{u.display_name || u.email}</div>
              <div className="small muted">{u.email}</div>
              <div className="small muted">
                {u.last_sign_in_at ? `zuletzt aktiv: ${fmtDateTime(u.last_sign_in_at)}` : "Einladung noch nicht angenommen"}
              </div>
            </div>
            <span className={`badge ${u.role === "admin" ? "orange" : "grey"}`}>{u.role === "admin" ? "Admin" : "Mitglied"}</span>
          </div>
          {u.id !== profile?.id && (
            <div className="row gap top wrap">
              <button className="btn small-btn secondary" onClick={() => newLink(u)}>Neuer Link</button>
              <button className="btn small-btn secondary" onClick={() => toggleRole(u)}>
                {u.role === "admin" ? "Admin entziehen" : "Zum Admin machen"}
              </button>
              <button className="btn small-btn danger-outline" onClick={() => remove(u)}>Entfernen</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ Ressourcen
const EMPTY = { name: "", kind: "Lastenrad", description: "", current_location: "" };

function Resources() {
  const { data, reload } = useLive(() => fetchResources(true), []);
  const [editing, setEditing] = useState<Partial<Resource> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload = {
      name: editing.name?.trim(),
      kind: editing.kind?.trim() || "Sonstiges",
      description: editing.description?.trim() ?? "",
      current_location: editing.current_location?.trim() ?? "",
    };
    const { error } = editing.id
      ? await supabase.from("resources").update(payload).eq("id", editing.id)
      : await supabase.from("resources").insert(payload);
    if (error) return setMessage(errorText(error));
    setEditing(null);
    setMessage(null);
    reload();
  }

  async function toggleActive(r: Resource) {
    const { error } = await supabase.from("resources").update({ active: !r.active }).eq("id", r.id);
    if (error) return alert(errorText(error));
    reload();
  }

  return (
    <div className="stack">
      {!editing && (
        <button className="btn primary" onClick={() => setEditing({ ...EMPTY })}>
          + Neue Ressource
        </button>
      )}

      {editing && (
        <form className="card stack" onSubmit={save}>
          <h2>{editing.id ? "Ressource bearbeiten" : "Neue Ressource"}</h2>
          <label>
            Name
            <input required value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label>
            Art
            <input
              list="kinds"
              value={editing.kind ?? ""}
              onChange={(e) => setEditing({ ...editing, kind: e.target.value })}
            />
            <datalist id="kinds">
              <option value="Lastenrad" />
              <option value="Fahrrad" />
              <option value="Anhänger" />
              <option value="Werkzeug" />
            </datalist>
          </label>
          <label>
            Beschreibung
            <textarea
              rows={3}
              value={editing.description ?? ""}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              placeholder="z. B. Schlosscode, Hinweise zum Akku …"
            />
          </label>
          <label>
            Standort
            <input
              value={editing.current_location ?? ""}
              onChange={(e) => setEditing({ ...editing, current_location: e.target.value })}
            />
          </label>
          {message && <p className="notice">{message}</p>}
          <div className="row gap">
            <button className="btn primary grow">Speichern</button>
            <button type="button" className="btn secondary grow" onClick={() => setEditing(null)}>
              Abbrechen
            </button>
          </div>
        </form>
      )}

      {data?.map((r) => (
        <div key={r.id} className={`card ${r.active ? "" : "inactive"}`}>
          <div className="row between">
            <div>
              <div className="strong">{r.name}</div>
              <div className="small muted">
                {r.kind} · 📍 {r.current_location || "unbekannt"}
              </div>
            </div>
            {!r.active && <span className="badge grey">deaktiviert</span>}
          </div>
          <div className="row gap top">
            <button className="btn small-btn secondary" onClick={() => setEditing(r)}>Bearbeiten</button>
            <button className="btn small-btn secondary" onClick={() => toggleActive(r)}>
              {r.active ? "Deaktivieren" : "Aktivieren"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
