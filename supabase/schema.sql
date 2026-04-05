-- Run this in Supabase Dashboard → SQL Editor (once per project).
-- Then set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local and on Vercel.

  create table if not exists sage_hospitals (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    floors jsonb not null default '{}',
    passwords jsonb default '{}',
    primary_floor text,
    created_at timestamptz default now()
  );

  create table if not exists sage_beds (
    hospital_id uuid not null references sage_hospitals (id) on delete cascade,
    bed_id text not null,
    zone text not null,
    bed_number int not null,
    status text not null,
    patient jsonb,
    updated_at timestamptz default now(),
    primary key (hospital_id, bed_id)
  );

  create index if not exists sage_beds_hospital_id_idx on sage_beds (hospital_id);

  create table if not exists sage_events (
    id text primary key,
    hospital_id uuid not null references sage_hospitals (id) on delete cascade,
    type text,
    message text,
    severity text,
    event_time text,
    created_at timestamptz default now()
  );

  create index if not exists sage_events_hospital_id_idx on sage_events (hospital_id);

  alter table sage_hospitals enable row level security;
  alter table sage_beds enable row level security;
  alter table sage_events enable row level security;

  -- Demo / hackathon: full access for anon. Tighten policies before production.
  create policy "sage_hospitals_anon_all" on sage_hospitals for all using (true) with check (true);
  create policy "sage_beds_anon_all" on sage_beds for all using (true) with check (true);
  create policy "sage_events_anon_all" on sage_events for all using (true) with check (true);
