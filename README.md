# Lastenrad teilen

Einfache App, um ein Lastenrad (und beliebige weitere Ressourcen) über einen Kalender zu teilen.
Läuft als **Progressive Web App** im Browser und als **Android-/iOS-App** (Capacitor). Backend: **Supabase**.

## Funktionen

- **Nur auf Einladung**: keine öffentliche Registrierung. Ein Admin lädt Personen ein – per E-Mail oder per Link, den er selbst verschickt (z. B. Messenger).
- **Übersicht**: alle Ressourcen mit Status (frei / unterwegs / nicht zurückgegeben) und aktuellem Standort, darüber „Meine Buchungen“.
- **Kalender** pro Ressource (Monatsansicht), Tag antippen → Buchungen des Tages, „Buchen“.
- **Buchen** für einen Zeitraum in der Zukunft; Überschneidungen werden verhindert (auch in der Datenbank).
- **Zurückgeben**: Standort als Text (mit Vorschlägen) und optional GPS-Position. Der Standort wird an der Ressource gespeichert. Frühe Rückgabe gibt den Rest des Zeitraums frei.
- **Stornieren** vor Beginn.
- **Verwaltung (Admin)**: Personen einladen, neuen Login-Link erzeugen, Admin-Rechte vergeben, entfernen; Ressourcen anlegen, bearbeiten, deaktivieren.
- Live-Aktualisierung über Supabase Realtime, Hell-/Dunkelmodus.

## Aufbau

| Pfad | Inhalt |
|---|---|
| `src/` | React + TypeScript (Vite) |
| `supabase/migrations/` | Datenbankschema inkl. Row Level Security |
| `supabase/functions/admin-users/` | Edge Function für Einladungen & Benutzerverwaltung |
| `android/`, `ios/` | native Projekte (Capacitor) |

Datenmodell: `profiles` (Rolle admin/member), `resources`, `bookings`. Rückgabe, Storno und Rollenwechsel laufen über
geprüfte Datenbankfunktionen (`return_booking`, `cancel_booking`, `set_user_role`).
**Der allererste Benutzer wird automatisch Admin.**

## Einmalige Einrichtung in Supabase (Dashboard)

Projekt: `Lastenrad` (`wiaiknfqtnrpawsyxanj`) – Schema und Edge Function sind bereits eingespielt.

1. **Authentication → Sign In / Providers**: „Allow new users to sign up“ **ausschalten** (nur noch Einladungen).
2. **Authentication → URL Configuration**:
   - *Site URL*: Adresse der Web-App (lokal `http://localhost:5173`, später z. B. `https://lastenrad.example.de`)
   - *Redirect URLs*: dieselbe Adresse(n) eintragen.
3. **Ersten Admin anlegen**: *Authentication → Users → Add user → Send invitation* mit deiner E-Mail.
   Link in der Mail öffnen → Name + Passwort festlegen → du bist Admin.
4. Optional: **eigenen SMTP-Server** (Authentication → Emails) eintragen. Der eingebaute Mailversand von Supabase
   schickt nur sehr wenige Mails pro Stunde. Alternativ in der App „Einladungslink erstellen“ nutzen – das braucht keinen Mailversand.

## Entwicklung

```bash
npm install
npm run dev
```

`.env` enthält Supabase-URL, Publishable Key und `VITE_APP_URL` (Ziel der Einladungslinks).

## Als PWA veröffentlichen

```bash
npm run build
```

Den Ordner `dist/` auf einen beliebigen statischen Host legen (z. B. Netlify, Vercel, Cloudflare Pages).
Wichtig: alle Pfade auf `index.html` umleiten (SPA-Fallback) und `VITE_APP_URL` sowie die Site URL in Supabase auf die
öffentliche Adresse setzen. Auf dem Handy dann im Browser „Zum Startbildschirm hinzufügen“.

## Android / iOS

```bash
npm run cap:android
```

öffnet das Projekt in Android Studio (dort bauen/signieren). iOS braucht einen Mac mit Xcode und CocoaPods:

```bash
npm run cap:ios
```

Einladungs- und Passwort-Links öffnen sich im Browser (Web-App). Danach kann man sich in der nativen App mit E-Mail und Passwort anmelden.
