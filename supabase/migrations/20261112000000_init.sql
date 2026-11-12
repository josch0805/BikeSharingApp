-- Lastenrad-Sharing: Grundschema
create extension if not exists btree_gist;

-- ---------------------------------------------------------------
-- Profile (1:1 zu auth.users)
-- ---------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Ressourcen (Lastenrad, weitere Räder, ...)
-- ---------------------------------------------------------------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  kind text not null default 'Lastenrad',
  active boolean not null default true,
  current_location text not null default '',
  current_lat double precision,
  current_lng double precision,
  location_updated_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- Buchungen
-- ---------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  note text not null default '',
  status text not null default 'booked' check (status in ('booked', 'returned', 'cancelled')),
  returned_at timestamptz,
  return_location text,
  return_lat double precision,
  return_lng double precision,
  created_at timestamptz not null default now(),
  constraint bookings_time_order check (ends_at > starts_at),
  -- keine überlappenden Buchungen pro Ressource
  constraint bookings_no_overlap exclude using gist (
    resource_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled')
);

create index bookings_user_idx on public.bookings(user_id);
create index bookings_resource_time_idx on public.bookings(resource_id, starts_at);

-- ---------------------------------------------------------------
-- Hilfsfunktionen
-- ---------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Profil automatisch anlegen, wenn ein Benutzer eingeladen/angelegt wird.
-- Der allererste Benutzer wird automatisch Admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when exists (select 1 from public.profiles) then 'member' else 'admin' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------

-- Rückgabe: Buchung abschließen + Standort der Ressource aktualisieren
create or replace function public.return_booking(
  p_booking_id uuid,
  p_location text,
  p_lat double precision default null,
  p_lng double precision default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Buchung nicht gefunden';
  end if;
  if b.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Keine Berechtigung';
  end if;
  if b.status <> 'booked' then
    raise exception 'Buchung ist nicht aktiv';
  end if;
  if b.starts_at > now() then
    raise exception 'Buchung hat noch nicht begonnen';
  end if;
  if coalesce(trim(p_location), '') = '' then
    raise exception 'Bitte einen Standort angeben';
  end if;

  update public.bookings
     set status = 'returned',
         returned_at = now(),
         ends_at = greatest(least(ends_at, now()), starts_at + interval '1 minute'),
         return_location = trim(p_location),
         return_lat = p_lat,
         return_lng = p_lng
   where id = p_booking_id;

  update public.resources
     set current_location = trim(p_location),
         current_lat = p_lat,
         current_lng = p_lng,
         location_updated_at = now()
   where id = b.resource_id;
end;
$$;

-- Stornieren (nur vor Beginn, eigene Buchung oder Admin)
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Buchung nicht gefunden';
  end if;
  if b.user_id <> auth.uid() and not public.is_admin() then
    raise exception 'Keine Berechtigung';
  end if;
  if b.status <> 'booked' then
    raise exception 'Buchung ist nicht aktiv';
  end if;
  if b.starts_at <= now() and not public.is_admin() then
    raise exception 'Laufende Buchungen bitte zurückgeben statt stornieren';
  end if;
  update public.bookings set status = 'cancelled' where id = p_booking_id;
end;
$$;

-- Rolle ändern (nur Admin, nicht sich selbst)
create or replace function public.set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Keine Berechtigung';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Die eigene Rolle kann nicht geändert werden';
  end if;
  if p_role not in ('admin', 'member') then
    raise exception 'Ungültige Rolle';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

revoke execute on function public.return_booking(uuid, text, double precision, double precision) from public, anon;
revoke execute on function public.cancel_booking(uuid) from public, anon;
revoke execute on function public.set_user_role(uuid, text) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.return_booking(uuid, text, double precision, double precision) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.bookings enable row level security;

-- Profile: alle angemeldeten sehen alle (Namen im Kalender), eigenes Profil bearbeiten
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- nur der Anzeigename darf vom Benutzer selbst geändert werden
revoke update on public.profiles from authenticated, anon;
grant update (display_name) on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated, anon;

-- Ressourcen: alle lesen, Admins verwalten
create policy "resources_select" on public.resources
  for select to authenticated using (true);
create policy "resources_admin_insert" on public.resources
  for insert to authenticated with check ((select public.is_admin()));
create policy "resources_admin_update" on public.resources
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "resources_admin_delete" on public.resources
  for delete to authenticated using ((select public.is_admin()));

-- Buchungen: alle lesen; eigene Buchung in der Zukunft anlegen; Änderungen nur über RPCs bzw. Admin
create policy "bookings_select" on public.bookings
  for select to authenticated using (true);
create policy "bookings_insert_own" on public.bookings
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and status = 'booked'
    and returned_at is null
    and starts_at >= now() - interval '15 minutes'
    and exists (select 1 from public.resources r where r.id = resource_id and r.active)
  );
create policy "bookings_admin_update" on public.bookings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "bookings_admin_delete" on public.bookings
  for delete to authenticated using ((select public.is_admin()));

revoke all on public.profiles, public.resources, public.bookings from anon;

-- Realtime für Live-Aktualisierung des Kalenders
alter publication supabase_realtime add table public.bookings, public.resources;

-- Startdaten: das erste Lastenrad
insert into public.resources (name, description, kind, current_location)
values ('Lastenrad', 'Unser gemeinsames Lastenrad', 'Lastenrad', '');
