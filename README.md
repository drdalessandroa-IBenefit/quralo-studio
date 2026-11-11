# Quralo Studio

Costruisci "Quralo", un SaaS B2B verticale per terapisti manuali (osteopati, chinesiologi, fisioterapisti). Non e' un gestionale passivo: e' un Client Acquisition & Retention Engine che riempie l'agenda e aumenta l'LTV del paziente, oltre a gestire clinica e burocrazia. Interfaccia interamente in italiano, mobile first (si usa su tablet e smartphone in studio), stile pulito: colore primario indigo, sfondo grigio chiaro, card bianche con bordo sottile, icone lucide.

STACK: React, Vite, Tailwind, shadcn/ui, React Router, database e auth su Lovable Cloud (Supabase). Usa il client Supabase generato (src/integrations/supabase/client.ts), non creare un client a mano.

AUTENTICAZIONE: login e registrazione email/password per il terapista. Tutto l'app e' dietro login. Nessuna pagina pubblica oltre al login.

REGOLE DI SICUREZZA NON NEGOZIABILI (dati sanitari, GDPR):
1. Row Level Security attiva su tutte le tabelle, isolamento per terapista (auth.uid()).
2. Il client NON invia mai therapist_id: lo imposta il database con default auth.uid().
3. Gli importi in denaro sono sempre interi in centesimi, mai decimali.
4. Le fatture si emettono SOLO tramite la funzione SQL issue_invoice (numerazione progressiva atomica per anno), il client non puo' inserire, modificare o cancellare fatture.
5. Le note cliniche sono solo inseribili e leggibili (nessun update/delete): le correzioni sono nuove note.
6. Il bucket storage "signatures" e' privato, cartella = auth.uid(), nessuna policy di update/delete (la firma e' una prova immutabile).
7. Ogni operazione Supabase gestisce l'errore e mostra un messaggio chiaro all'utente (mai fallimenti silenziosi, niente alert() del browser: usa una barra di notifica o i toast shadcn).

DATABASE: crea una migrazione con esattamente questo schema, poi rigenera i tipi.

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

RLS (abilitala su tutte le tabelle):
- therapist_profiles: for all using (id = auth.uid()) with check (id = auth.uid())
- patients: for all using (therapist_id = auth.uid()) with check (therapist_id = auth.uid())
- clinical_notes: select using (therapist_id = auth.uid()); insert with check (therapist_id = auth.uid() and public.owns_patient(patient_id)); nessun update/delete
- appointments: for all using (therapist_id = auth.uid()) with check (therapist_id = auth.uid() and public.owns_patient(patient_id))
- invoices: SOLO select using (therapist_id = auth.uid()); nessun insert/update/delete da client
- invoice_counters: RLS attiva senza policy (accesso solo via issue_invoice)
- marketing_events e referral_codes: for all using (therapist_id = auth.uid()) with check (therapist_id = auth.uid() and public.owns_patient(patient_id))
- Storage: bucket privato "signatures"; policy insert e select to authenticated con bucket_id = 'signatures' and (storage.foldername(name))[1] = auth.uid()::text; nessuna policy update/delete.

TAB DELL'APP (navigazione in alto, 6 tab):

1) PAZIENTI E FIRMA. Lista con ricerca, colonne nome, contatti, codice fiscale, stato informativa (Firmata / Da firmare), stato marketing. Modale "Nuovo paziente": nome, cognome, email, telefono, codice fiscale (validato con regex italiana tollerante alle omocodie: ^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$), tag separati da virgola (salvati minuscoli in tags), codice amico facoltativo (referred_by_code). Dopo il salvataggio si passa direttamente alla firma. Schermata di firma: testo di presa visione dell'informativa privacy (artt. 13 e 14 GDPR, finalita' di cura e gestione amministrativa e fiscale) con versione testo "v1.0-2026-11", poi un checkbox SEPARATO e FACOLTATIVO, non preselezionato, per il consenso a ricevere messaggi WhatsApp di promemoria, inviti a controlli e richieste di recensione, revocabile senza conseguenze sulle cure. Canvas di firma touch con Pointer Events: la risoluzione interna del canvas deve coincidere con quella mostrata (devicePixelRatio) cosi' il tratto segue il dito senza sfasamenti; touch-action none; pulsante Pulisci. Il salvataggio carica il PNG su signatures/{auth.uid()}/{patientId}_{timestamp}.png con upsert false, poi aggiorna il paziente con consent_privacy, consent_date, consent_text_version, signature_path, consent_marketing e consent_marketing_date (solo se spuntato).

2) CARTELLA CLINICA. Form: paziente, anamnesi, piano di trattamento, note di seduta (almeno un campo obbligatorio). Elenco note con data e ora, filtrabile per paziente. Solo inserimento.

3) AGENDA. Servizi: Prima visita 60 min, Trattamento di controllo 30 min, Trattamento avanzato 45 min (costante facilmente estendibile). Prenotazione con paziente, servizio, data, ora. Controllo client di sovrapposizione con messaggio amichevole, piu' gestione dell'errore Postgres 23P01 dal vincolo no_overlap. Per ogni appuntamento prenotato i pulsanti Completato, Non presentato, Annulla. Di default mostra da oggi in poi, con checkbox "Mostra anche lo storico".

4) FATTURE E TS. Form: paziente, totale in euro, di cui contanti; il POS e' calcolato come totale meno contanti e mostrato in sola lettura. Conversione in centesimi con Math.round. Chiama supabase.rpc('issue_invoice', {p_patient_id, p_total_cents, p_cash_cents, p_pos_cents}). Se il paziente non ha un CF valido, blocca con un messaggio, salvo checkbox "Emetti senza CF valido del paziente". Se il totale supera 77,47 euro mostra un avviso ambra: sul documento esente IVA e' dovuta la marca da bollo da 2 euro, da confermare con il commercialista. Tabella con numero, data gg/mm/aaaa, paziente, importo in formato it-IT, dettaglio contanti/POS, bollo. Export CSV mensile con selettore mese: separatore punto e virgola, BOM UTF-8, colonne CF professionista (da therapist_profiles), CF paziente, data gg/mm/aaaa, numero documento, importo, contanti, POS, bollo dovuto. Blocca l'export se manca il CF del professionista. Etichetta onesta: "Esporta CSV mensile" con nota che NON e' il tracciato XML ufficiale del Sistema Tessera Sanitaria ma un riepilogo per il commercialista.

5) GROWTH ENGINE con 4 sotto tab. Regole comuni: si mostrano SOLO pazienti con consent_marketing = true e telefono valido; i messaggi partono con click manuale dal terapista (apertura di https://wa.me/{numero}?text=...), dopo un'anteprima modificabile in una modale; ogni apertura viene registrata in marketing_events per non ricontattare troppo presto. Normalizzazione telefono: tieni solo le cifre, rimuovi un eventuale prefisso 00, se non inizia con 39 e ha al massimo 11 cifre anteponi 39, valido solo se almeno 11 cifre. I messaggi non devono MAI contenere dati sulla salute del paziente.
 a) Riattivazione: pazienti con almeno un appuntamento non annullato e nessun appuntamento negli ultimi 90 giorni (un paziente senza appuntamenti NON e' dormiente), esclusi quelli contattati con type dormant negli ultimi 60 giorni. Messaggio base: "Ciao {nome}, sono {studio}. E' un po' che non ci vediamo: se ti fa piacere fissare un controllo, rispondi pure a questo messaggio. Se non vuoi piu' ricevere messaggi scrivi STOP." Mostra un avviso con il numero di dormienti esclusi perche' senza consenso marketing.
 b) Recensioni Google: pazienti con un appuntamento completed negli ultimi 14 giorni, non contattati con type review negli ultimi 180 giorni. Usa google_review_url del profilo. Se manca, mostra il messaggio "Per richiedere recensioni serve il link della tua scheda Google, inseriscilo nella tab Studio" e nessun pulsante vuoto.
 c) Passaparola: elenco pazienti con pulsante "Genera codice" (formato QRL + 5 caratteri da alfabeto senza caratteri ambigui, generati con crypto.getRandomValues, salvato in referral_codes), contatore dei nuovi pazienti che hanno quel codice in referred_by_code, pulsante per copiare il messaggio con il codice.
 d) Campagne: segmento scelto tra i tag esistenti, modello di messaggio modificabile con segnaposto {nome} e {studio}, elenco destinatari con consenso, esclusi i contattati con type campaign nelle ultime 2 settimane, invio uno a uno con anteprima.

6) STUDIO. Form del profilo: nome e cognome, nome dello studio, codice fiscale professionista, partita IVA (11 cifre), link recensioni Google (deve iniziare con https://). Salvataggio con upsert su therapist_profiles usando id = utente corrente.

QUALITA': TypeScript strict, componenti separati per ogni tab in src/components, nessun any inutile, stati di caricamento e di errore ovunque, accessibile e usabile con una mano da smartphone. Dopo la build, verifica che la registrazione, la creazione di un paziente, la firma e la prenotazione funzionino davvero.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9b858789-fce0-47ca-ab32-333b4f609362).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
