// Benutzerverwaltung für Admins: einladen, Einladungslink erzeugen, auflisten, löschen.
// Nur Benutzer mit role = 'admin' in public.profiles dürfen diese Funktion nutzen.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Nur POST erlaubt" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Aufrufer prüfen
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData.user) return json({ error: "Nicht angemeldet" }, 401);
  const caller = userData.user;

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();
  if (profile?.role !== "admin") return json({ error: "Nur für Admins" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ungültige Anfrage" }, 400);
  }
  const action = String(body.action ?? "");
  const redirectTo = typeof body.redirectTo === "string" ? body.redirectTo : undefined;

  try {
    switch (action) {
      case "list": {
        const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
        if (error) throw error;
        const { data: profiles } = await admin.from("profiles").select("*");
        const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
        const users = data.users.map((u) => ({
          id: u.id,
          email: u.email,
          display_name: byId.get(u.id)?.display_name ?? "",
          role: byId.get(u.id)?.role ?? "member",
          last_sign_in_at: u.last_sign_in_at ?? null,
          invited_at: u.invited_at ?? null,
          created_at: u.created_at,
        }));
        return json({ users });
      }

      case "invite": {
        // Einladung per E-Mail (nutzt den SMTP-Versand von Supabase)
        const email = String(body.email ?? "").trim().toLowerCase();
        const displayName = String(body.displayName ?? "").trim();
        if (!email.includes("@")) return json({ error: "Bitte gültige E-Mail angeben" }, 400);
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo,
          data: { display_name: displayName },
        });
        if (error) throw error;
        return json({ user: { id: data.user.id, email: data.user.email } });
      }

      case "invite_link": {
        // Einladungslink erzeugen, den der Admin selbst verschickt (z. B. Messenger)
        const email = String(body.email ?? "").trim().toLowerCase();
        const displayName = String(body.displayName ?? "").trim();
        if (!email.includes("@")) return json({ error: "Bitte gültige E-Mail angeben" }, 400);

        const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
        const type = existing ? "recovery" : "invite";
        const { data, error } = await admin.auth.admin.generateLink({
          type,
          email,
          options: { redirectTo, data: { display_name: displayName } },
        } as Parameters<typeof admin.auth.admin.generateLink>[0]);
        if (error) throw error;
        // Link auf die App-Seite /einladung statt direkt auf /auth/v1/verify:
        // Der Einmal-Schlüssel wird erst beim Klick auf "Einladung annehmen" eingelöst,
        // damit Linkvorschauen und Mail-Scanner ihn nicht vorher verbrauchen.
        // Hat sich die Person noch nie angemeldet, zeigt die App trotzdem den Willkommens-Dialog.
        let neverSignedIn = type === "invite";
        if (existing) {
          const { data: u } = await admin.auth.admin.getUserById(existing.id);
          neverSignedIn = !u.user?.last_sign_in_at;
        }
        const base = (redirectTo ?? new URL(req.url).origin).replace(/\/+$/, "");
        const link =
          `${base}/einladung?token_hash=${encodeURIComponent(data.properties.hashed_token)}&type=${type}` +
          (neverSignedIn ? "&ui=invite" : "");
        return json({ link, type });
      }

      case "delete": {
        const userId = String(body.userId ?? "");
        if (!userId) return json({ error: "userId fehlt" }, 400);
        if (userId === caller.id) return json({ error: "Du kannst dich nicht selbst löschen" }, 400);
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw error;
        return json({ ok: true });
      }

      default:
        return json({ error: "Unbekannte Aktion" }, 400);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 400);
  }
});
