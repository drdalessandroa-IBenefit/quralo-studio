create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create table public.therapist_profiles (
  id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  full_name text,
  fiscal_code text check (fiscal_code is null or char_length(fiscal_code) = 16),
  vat_number text check (vat_number is null or vat_number ~ '^[0-9]{11}$'),
  studio_name text,
  google_review_url text check (google_review_url is null or google_review_url ~ '^https://'),
  created_at timestamptz not null default now()
);

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null default auth.uid() references auth.users(id),
  first_name text not null,
  last_name text not null,
  email text,
  phone text,
  fiscal_code text check (fiscal_code is null or char_length(fiscal_code) = 16),
  tags text[] not null default '{}',
  referred_by_code text,
  consent_privacy boolean not null default false,
  consent_date timestamptz,
  consent_text_version text,
  signature_path text,
  consent_marketing boolean not null default false,
  consent_marketing_date timestamptz,
  created_at timestamptz not null default now()
);
create index patients_therapist_idx on public.patients (therapist_id);

create or replace function public.owns_patient(pid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.patients where id = pid and therapist_id = auth.uid());
$$;

create table public.clinical_notes (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null default auth.uid() references auth.users(id),
  patient_id uuid not null references public.patients(id) on delete restrict,
  anamnesis text,
  treatment_plan text,
  session_notes text,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null default auth.uid() references auth.users(id),
  patient_id uuid not null references public.patients(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled','no_show')),
  service_type text,
  notes text,
  created_at timestamptz not null default now(),
  check (end_time > start_time),
  constraint no_overlap exclude using gist (
    therapist_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status <> 'cancelled')
);
create index appointments_patient_idx on public.appointments (patient_id, start_time);

create table public.invoice_counters (
  therapist_id uuid not null references auth.users(id),
  year int not null,
  last_number int not null default 0,
  primary key (therapist_id, year)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references auth.users(id),
  patient_id uuid not null references public.patients(id) on delete restrict,
  invoice_number text not null,
  issued_at date not null default (now() at time zone 'Europe/Rome')::date,
  total_cents int not null check (total_cents > 0),
  cash_cents int not null check (cash_cents >= 0),
  pos_cents int not null check (pos_cents >= 0),
  stamp_duty_due boolean not null default false,
  created_at timestamptz not null default now(),
  check (cash_cents + pos_cents = total_cents),
  unique (therapist_id, invoice_number)
);

create or replace function public.issue_invoice(p_patient_id uuid, p_total_cents int, p_cash_cents int, p_pos_cents int)
returns public.invoices language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  y int := extract(year from (now() at time zone 'Europe/Rome'))::int;
  n int;
  inv public.invoices;
begin
  if uid is null then raise exception 'Utente non autenticato'; end if;
  if not exists (select 1 from patients where id = p_patient_id and therapist_id = uid) then
    raise exception 'Paziente non trovato';
  end if;
  if p_total_cents <= 0 or p_cash_cents < 0 or p_pos_cents < 0 or p_cash_cents + p_pos_cents <> p_total_cents then
    raise exception 'Importi non coerenti';
  end if;
  insert into invoice_counters as c (therapist_id, year, last_number) values (uid, y, 1)
  on conflict (therapist_id, year) do update set last_number = c.last_number + 1
  returning c.last_number into n;
  insert into invoices (therapist_id, patient_id, invoice_number, total_cents, cash_cents, pos_cents, stamp_duty_due)
  values (uid, p_patient_id, y::text || '/' || lpad(n::text, 4, '0'), p_total_cents, p_cash_cents, p_pos_cents, p_total_cents > 7747)
  returning * into inv;
  return inv;
end $$;
revoke all on function public.issue_invoice(uuid, int, int, int) from public, anon;
grant execute on function public.issue_invoice(uuid, int, int, int) to authenticated;
revoke all on function public.owns_patient(uuid) from public, anon;
grant execute on function public.owns_patient(uuid) to authenticated;

create table public.marketing_events (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null default auth.uid() references auth.users(id),
  patient_id uuid not null references public.patients(id) on delete cascade,
  type text not null check (type in ('dormant','review','campaign')),
  sent_at timestamptz not null default now()
);
create index marketing_events_patient_idx on public.marketing_events (patient_id, type, sent_at desc);

create table public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null default auth.uid() references auth.users(id),
  patient_id uuid not null references public.patients(id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  unique (therapist_id, code),
  unique (patient_id)
);

-- Grants
grant select, insert, update, delete on public.therapist_profiles to authenticated;
grant select, insert, update, delete on public.patients to authenticated;
grant select, insert on public.clinical_notes to authenticated;
grant select, insert, update, delete on public.appointments to authenticated;
grant select on public.invoices to authenticated;
grant select, insert, update, delete on public.marketing_events to authenticated;
grant select, insert, update, delete on public.referral_codes to authenticated;
grant all on public.therapist_profiles, public.patients, public.clinical_notes, public.appointments, public.invoices, public.invoice_counters, public.marketing_events, public.referral_codes to service_role;

-- RLS
alter table public.therapist_profiles enable row level security;
alter table public.patients enable row level security;
alter table public.clinical_notes enable row level security;
alter table public.appointments enable row level security;
alter table public.invoice_counters enable row level security;
alter table public.invoices enable row level security;
alter table public.marketing_events enable row level security;
alter table public.referral_codes enable row level security;

create policy "own profile" on public.therapist_profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own patients" on public.patients for all to authenticated using (therapist_id = auth.uid()) with check (therapist_id = auth.uid());
create policy "read own notes" on public.clinical_notes for select to authenticated using (therapist_id = auth.uid());
create policy "insert own notes" on public.clinical_notes for insert to authenticated with check (therapist_id = auth.uid() and public.owns_patient(patient_id));
create policy "own appointments" on public.appointments for all to authenticated using (therapist_id = auth.uid()) with check (therapist_id = auth.uid() and public.owns_patient(patient_id));
create policy "read own invoices" on public.invoices for select to authenticated using (therapist_id = auth.uid());
create policy "own marketing events" on public.marketing_events for all to authenticated using (therapist_id = auth.uid()) with check (therapist_id = auth.uid() and public.owns_patient(patient_id));
create policy "own referral codes" on public.referral_codes for all to authenticated using (therapist_id = auth.uid()) with check (therapist_id = auth.uid() and public.owns_patient(patient_id));

-- Storage policies (bucket created separately)
create policy "signatures insert own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "signatures select own folder" on storage.objects for select to authenticated
  using (bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text);