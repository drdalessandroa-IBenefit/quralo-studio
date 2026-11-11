# CareConnect — Rewrite su Laravel + Inertia + React (spec di progettazione)

**Data:** 2026-11-11
**Stato:** proposta di design (da approvare prima del piano di implementazione)
**Autore:** Alfonso Esposito + Claude

## 1. Contesto e obiettivo

CareConnect è un SaaS per terapisti manuali (osteopati, chinesiologi,
fisioterapisti): agenda, cartella clinica, consenso GDPR firmato, fatturazione e
strumenti di ricontatto pazienti. La versione attuale (`careconnect/`, TanStack
Start + Supabase) è funzionante ma dipende da **Supabase** come piattaforma
(DB + auth + storage + RLS + RPC).

**Obiettivo del rewrite:** sostituire Supabase con uno stack **autonomo e
ospitabile su hosting Aruba condiviso (PHP + MySQL)**, mantenendo **parità
completa** di funzionalità e riusando l'interfaccia React già realizzata.

### Perché un rewrite e non una migrazione
L'app non parla con un database: parla con Supabase (auth, storage, PostgREST,
RLS con `auth.uid()`). Su hosting condiviso non esiste Supabase né PostgreSQL né
un runtime Node: vanno ricostruiti backend, autenticazione, storage e modello di
sicurezza. Il frontend React viene invece preservato.

### Non-goal
- Nessuna funzione nuova rispetto alla versione attuale (parità, non estensione).
- Nessun job in background / coda (l'hosting condiviso non li garantisce; il
  Growth invia messaggi WhatsApp **manualmente**, quindi non servono).
- Nessun invio automatico di messaggi ai pazienti.

## 2. Stack tecnologico

| Livello | Scelta |
|---|---|
| Backend | **Laravel 11** (PHP 8.2+) |
| Ponte FE/BE | **Inertia.js** (`@inertiajs/react`) |
| Frontend | **React 19** + **Tailwind CSS v4** + shadcn/ui (portati dall'attuale) |
| Auth | **Laravel Breeze** (starter Inertia+React): login, registrazione, reset password, verifica email |
| DB | **MySQL / MariaDB** (Aruba) |
| Storage firme | Disk `local` privato (`storage/app/private/signatures`) |
| Build asset | Vite (incluso in Breeze) |
| Test | Pest/PHPUnit (backend), Vitest (logica FE portata) |
| i18n | `laravel-vue-i18n` non serve: manteniamo i18next lato React con i file `locales/*.json` esistenti |

## 3. Struttura del repository

Si ristruttura **`/Users/alfonso/Developer/careconnect`** in un progetto Laravel.
La versione TanStack resta nello **storico git** (tag `pre-laravel`) come
riferimento da cui portare i componenti React.

```
careconnect/
├─ app/
│  ├─ Models/            # Therapist(User), Patient, ClinicalNote, Appointment,
│  │                     # Invoice, InvoiceCounter, MarketingEvent, ReferralCode, PresaleLead
│  ├─ Http/Controllers/  # un controller per modulo
│  ├─ Http/Requests/     # FormRequest con validazione (CF, importi, ecc.)
│  ├─ Policies/          # autorizzazione per modello
│  ├─ Scopes/            # OwnedByTherapist (global scope)
│  └─ Services/          # InvoiceService, GrowthService, SignatureService
├─ database/migrations/  # schema MySQL
├─ resources/js/         # React: pages Inertia + components (shadcn) + lib + locales
│  ├─ pages/             # Dashboard, Auth, Prevendita, PatientDetail
│  ├─ components/        # portati da careconnect/src/components
│  └─ lib/               # logica pura portata (today.ts, followup.ts, quralo.ts → rinominati)
├─ resources/css/app.css # design system teal (da src/styles.css)
├─ routes/web.php        # route Inertia + API interne
└─ docs/
```

## 4. Modello dati (MySQL)

ID: **UUID** (`char(36)`, trait `HasUuids`) per non esporre contatori. Denaro:
**interi in centesimi**. `therapist_id` = `users.id`.

### users (Breeze) + therapist_profiles (1:1)
- `users`: id, name, email (unique), password, email_verified_at, timestamps.
- `therapist_profiles`: user_id (pk/fk), full_name, studio_name,
  fiscal_code (16, nullable, validato), vat_number (11 cifre, nullable),
  google_review_url (nullable, deve iniziare con https://), timestamps.

### patients
id, **therapist_id** (fk), first_name, last_name, email?, phone?,
fiscal_code? (16, regex IT con omocodie), **tags** (JSON array, lowercase),
referred_by_code?, consent_privacy (bool), consent_date?, consent_text_version?,
signature_path?, consent_marketing (bool, default false), consent_marketing_date?,
timestamps. Indice su therapist_id.

### clinical_notes — append-only
id, therapist_id, patient_id (fk), anamnesis?, treatment_plan?, session_notes?,
created_at. Nessun update/delete (le correzioni sono nuove note). Almeno un campo
testuale obbligatorio (validato nel FormRequest).

### appointments
id, therapist_id, patient_id, start_time, end_time, **status**
(`scheduled|completed|cancelled|no_show`, default scheduled), service_type?,
notes?, timestamps. Vincoli: `end_time > start_time`; **anti-sovrapposizione**
applicata nel servizio (vedi §6.3), non con constraint DB (MySQL non ha
exclusion constraint). Indice (therapist_id, start_time).

### invoices + invoice_counters
- `invoice_counters`: therapist_id, year, last_number — **pk (therapist_id, year)**.
- `invoices`: id, therapist_id, patient_id, invoice_number, issued_at (date),
  total_cents (>0), cash_cents (≥0), pos_cents (≥0), stamp_duty_due (bool),
  created_at. Vincoli: `cash+pos=total`; **unique (therapist_id, invoice_number)**.
  Emissione **solo** via `InvoiceService` (vedi §6.4).

### marketing_events
id, therapist_id, patient_id, type (`dormant|review|campaign`), sent_at.
Indice (patient_id, type, sent_at desc).

### referral_codes
id, therapist_id, patient_id, code, created_at. unique (therapist_id, code),
unique (patient_id).

### presale_leads
id, first_name, last_name, email, phone?, profession
(`osteopath|kinesiologist|physiotherapist|other`), consent_privacy (bool),
created_at. **Pubblica** (insert senza auth; honeypot anti-bot lato controller).
È l'unica tabella non isolata per terapista.

## 5. Sicurezza — sostituire la RLS di Postgres

La RLS garantiva che ogni terapista vedesse solo i propri dati. Su MySQL non
esiste: va replicato **a livello applicativo, in modo automatico**, perché
dipendere da un `where therapist_id` scritto a mano in ogni query significa, su
dati sanitari, rischiare fughe tra pazienti.

**Meccanismo (doppio strato):**
1. **Global Scope `OwnedByTherapist`** applicato a tutti i modelli "di proprietà"
   (Patient, ClinicalNote, Appointment, Invoice, MarketingEvent, ReferralCode):
   aggiunge **automaticamente** `where therapist_id = auth()->id()` a ogni query.
2. **Model event `creating`**: imposta `therapist_id = auth()->id()`
   automaticamente. Il client **non invia mai** `therapist_id`.
3. **Policies** Laravel su ogni azione + **route model binding**: un id altrui
   restituisce 404 (grazie allo scope) o 403 (policy).
4. **Append-only** per `clinical_notes` e immutabilità firme garantite
   rimuovendo le route di update/delete e con guard nel modello.

Tutto dietro login (middleware `auth`), tranne landing e `presale_leads`.

## 6. Logica di dominio (servizi)

### 6.1 Validazione codice fiscale
Regex IT tollerante alle omocodie:
`^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$`
in una Rule riusabile. Tag salvati minuscoli.

### 6.2 Firma e consenso (SignatureService)
Canvas touch (React, Pointer Events, risoluzione = devicePixelRatio) → PNG →
upload su disk privato `signatures/{therapistId}/{patientId}_{timestamp}.png`
(no overwrite). Poi aggiorna il paziente: consent_privacy, consent_date,
consent_text_version (**`v1.0-2026-11`**), signature_path, e — solo se spuntato —
consent_marketing + consent_marketing_date (checkbox separato e facoltativo).
Download firma solo via route protetta da policy.

### 6.3 Agenda (AppointmentService)
Servizi: Prima visita 60', Controllo 30', Avanzato 45' (costante estendibile) +
durata custom. Prenotazione in **transazione**: controlla sovrapposizione
(`status <> cancelled` AND `start < nuovoEnd` AND `end > nuovoStart`) per il
terapista; se presente → messaggio amichevole. Azioni: Completato, Non presentato,
Annulla. Default: da oggi in poi, con opzione "mostra storico". Export ICS.

### 6.4 Fatture (InvoiceService)
`issue($patientId, $totalCents, $cashCents, $posCents)` in **transazione** con
`lockForUpdate` sul contatore (therapist_id, year): incrementa atomicamente,
numero `Y/NNNN`, `stamp_duty_due = total_cents > 7747` (marca da bollo >77,47€).
Valida: importi coerenti (cash+pos=total), CF paziente valido salvo opzione
"emetti senza CF". Export **CSV mensile** (separatore `;`, BOM UTF-8, colonne:
CF professionista, CF paziente, data gg/mm/aaaa, numero, importo, contanti, POS,
bollo). Export bloccato se manca il CF del professionista. Etichetta onesta: non
è il tracciato XML del Sistema TS.

### 6.5 Growth (GrowthService) — 4 sotto-moduli
Mostra **solo** pazienti con `consent_marketing = true` e telefono valido. Invio
sempre manuale: apre `https://wa.me/{num}?text=...` dopo anteprima modificabile;
ogni apertura registra un `marketing_event`. Normalizzazione telefono: solo
cifre, rimuovi `00` iniziale, se non inizia con `39` e ≤11 cifre anteponi `39`,
valido se ≥11 cifre. I messaggi non contengono **mai** dati sulla salute.
- **Riattivazione**: ≥1 appuntamento non annullato e nessuno negli ultimi **90
  giorni**; esclusi i contattati `dormant` negli ultimi **60 giorni**. Avviso sul
  numero di dormienti esclusi per mancanza di consenso.
- **Recensioni Google**: appuntamento `completed` negli ultimi **14 giorni**, non
  contattati `review` negli ultimi **180 giorni**; usa `google_review_url` (se
  manca, messaggio che rimanda alla tab Studio).
- **Passaparola**: genera codice `QRL`+5 char (alfabeto non ambiguo,
  `random_bytes`), salvato in referral_codes; contatore nuovi pazienti con quel
  `referred_by_code`; copia messaggio.
- **Campagne**: segmento per tag esistente, modello con `{nome}`/`{studio}`,
  esclusi i contattati `campaign` nelle ultime **2 settimane**, invio uno a uno.

### 6.6 Studio
Form profilo: nome e cognome, nome studio, CF professionista, P.IVA (11 cifre),
link recensioni Google (https://). Upsert su `therapist_profiles`.

### 6.7 Oggi
Dashboard: appuntamenti del giorno + conteggio pazienti pronti per il Growth.

### 6.8 Leads / Prevendita
Landing pubblica + form lead (public insert, honeypot anti-bot).

## 7. Mappa parità moduli → componenti

Gli 8 moduli e i componenti React esistenti vengono portati 1:1 dentro
`resources/js`, cambiando solo il livello dati: da `supabase.from(...)` /
`supabase.rpc` / `supabase.auth` a **chiamate Inertia** (`router.post/put`,
`usePage().props`) verso i controller Laravel. 15 file frontend, ~26 call site da
riconvertire.

## 8. Frontend con Inertia

- Pagine Inertia in `resources/js/pages`; il layout dashboard (sidebar 8 tab) e i
  componenti UI (shadcn, design teal) restano invariati nell'aspetto.
- Dati iniziali via **props Inertia** (niente fetch client separato per il primo
  render); mutazioni via `router`/`useForm`; invalidazione via Inertia reload
  parziale. React Query non più necessario (lo rimuoviamo) perché Inertia gestisce
  lo stato di pagina.
- i18next resta per le traduzioni (it/en/es/fr) con i `locales/*.json` esistenti.
- Design system: `src/styles.css` → `resources/css/app.css` (token teal, Plus
  Jakarta Sans) invariato.

## 9. Deployment su hosting Aruba condiviso

Vincoli reali: PHP + MySQL, **document root impostabile**, probabilmente **senza
SSH/Composer/worker** sui piani base.

Strategia:
1. Build in **locale**: `composer install --no-dev -o` + `npm run build`
   (asset in `public/build`).
2. Upload dell'app via FTP; **document root del dominio → cartella `public/`**.
3. `.env` di produzione con credenziali MySQL Aruba + `APP_KEY` generata in locale.
4. Migrazioni: se niente SSH, due opzioni — (a) **export SQL** delle migrazioni e
   import da **phpMyAdmin** Aruba; (b) route one-shot protetta che esegue
   `migrate --force` e poi si rimuove.
5. Cache config/route generate in locale (`config:cache`, `route:cache`) e
   caricate.
6. Storage firme: cartella `storage/app/private` **fuori** da `public/`,
   permessi di scrittura; nessun symlink pubblico.

> Se il piano Aruba non reggesse Laravel (versione PHP < 8.2, niente document root
> su `/public`, filesystem non scrivibile), il fallback è un **VPS Aruba**; da
> decidere solo a deploy, non blocca lo sviluppo.

## 10. Testing

- **Backend (Pest):** isolamento per terapista (lo scope impedisce l'accesso ai
  dati altrui), numerazione fatture atomica e progressiva, anti-sovrapposizione
  agenda, validazione CF, append-only note cliniche, immutabilità firme, calcolo
  bollo >77,47€, logica Growth (finestre 90/14/180/60/14gg).
- **Frontend (Vitest):** logica pura portata (today, followup, normalizzazione
  telefono) — riuso dei test esistenti.

## 11. Fasi di implementazione (dettaglio nel piano)

1. Scaffold Laravel 11 + Breeze (Inertia+React) dentro `careconnect/` (tag
   `pre-laravel`); porting design system + shadcn + i18n.
2. Auth + modello Therapist/profilo + modulo **Studio**.
3. **Pazienti** + **Firma** (SignatureService, consenso GDPR).
4. **Agenda** (AppointmentService, anti-overlap, ICS).
5. **Cartella clinica** (append-only).
6. **Fatture + TS** (InvoiceService, CSV).
7. **Growth engine** (4 sotto-moduli).
8. **Oggi** (dashboard) + **Leads/Prevendita** (landing pubblica).
9. Hardening sicurezza (policy audit) + deploy Aruba.

## 12. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Isolamento dati sanitari senza RLS | Global scope automatico + policy + test dedicati di cross-tenant |
| Hosting condiviso non adatto a Laravel | Verifica PHP≥8.2 e document root; fallback VPS Aruba |
| Migrazioni senza SSH | Import SQL via phpMyAdmin o route one-shot protetta |
| Perdita di funzionalità nel porting | Spec a parità + mappa modulo→componente + checklist per modulo |
| Numerazione fatture concorrente | Transazione + lockForUpdate sul contatore |
| Anti-overlap senza exclusion constraint | Controllo in transazione nel service + test |
```
