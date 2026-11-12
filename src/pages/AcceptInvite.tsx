import { useState } from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { errorText, supabase } from "../supabase";

/**
 * Zielseite für Einladungs- und Passwort-Links: /einladung?token_hash=...&type=invite|recovery
 *
 * Der Einmal-Schlüssel wird erst beim Klick auf den Knopf eingelöst. So können
 * Linkvorschauen (Messenger, Teams) und Mail-Scanner (Outlook Safe Links) den
 * Link aufrufen, ohne ihn zu verbrauchen.
 */
export default function AcceptInvite({ onDone }: { onDone: () => void }) {
  const params = new URLSearchParams(window.location.search);
  const tokenHash = params.get("token_hash");
  const type = (params.get("type") === "recovery" ? "recovery" : "invite") as EmailOtpType;
  // ui=invite: Person war schon angelegt, hat sich aber noch nie angemeldet
  const isInvite = type === "invite" || params.get("ui") === "invite";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(tokenHash ? null : "Der Link ist unvollständig.");

  async function accept() {
    if (!tokenHash) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) {
      setBusy(false);
      setMessage(
        error.message.toLowerCase().includes("expired") || error.message.toLowerCase().includes("invalid")
          ? "Dieser Link ist abgelaufen oder wurde schon benutzt. Bitte frag nach einem neuen Link."
          : errorText(error),
      );
      return;
    }
    sessionStorage.setItem("needsPassword", isInvite ? "invite" : "recovery");
    onDone();
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img src="/icon.svg" alt="" className="auth-logo" />
        <h1>{isInvite ? "Du bist eingeladen!" : "Passwort zurücksetzen"}</h1>
        <p className="muted">
          {isInvite
            ? "Tippe auf den Knopf, um die Einladung anzunehmen. Danach legst du deinen Namen und dein Passwort fest."
            : "Tippe auf den Knopf, um ein neues Passwort festzulegen."}
        </p>
        {message && <p className="notice">{message}</p>}
        <button className="btn primary big" onClick={accept} disabled={busy || !tokenHash}>
          {busy ? "Einen Moment …" : isInvite ? "Einladung annehmen" : "Weiter"}
        </button>
        <a className="btn link" href="/">Zur Anmeldung</a>
      </div>
    </div>
  );
}
