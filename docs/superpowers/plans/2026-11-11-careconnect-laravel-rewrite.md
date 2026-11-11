# CareConnect Laravel Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reimplementare CareConnect come app Laravel 11 + Inertia + React su MySQL, con parità completa degli 8 moduli, ospitabile su hosting Aruba condiviso, senza Supabase.

**Architecture:** Monolite Laravel (controller + policy + service) con Inertia che serve pagine React (componenti shadcn portati, design teal). L'isolamento per terapista — prima garantito dalla RLS di Postgres — è replicato da un Global Scope automatico + Policies. Logica sensibile (numerazione fatture, anti-overlap agenda, firma) vive in service testati.

**Tech Stack:** Laravel 11, PHP 8.2+, Inertia.js (`@inertiajs/react`), React 19, Tailwind v4, shadcn/ui, Laravel Breeze, MySQL/MariaDB, Pest, Vite, i18next.

**Spec:** `docs/superpowers/specs/2026-11-11-careconnect-laravel-rewrite-design.md`

## Global Constraints

- PHP **8.2+**, **Laravel 11**, auth via **Laravel Breeze** (stack Inertia+React).
- Chiavi primarie **UUID** (`char(36)`, trait `HasUuids`). Denaro **intero in centesimi**.
- Il client **non invia mai** `therapist_id`: lo imposta il server dall'utente autenticato.
- Versione testo informativa consenso: **`v1.0-2026-11`** (verbatim).
- Servizi agenda: **Prima visita 60'**, **Trattamento di controllo 30'**, **Trattamento avanzato 45'** (+ durata custom).
- Marca da bollo dovuta se `total_cents > 7747` (soglia 77,47€).
- Regex CF IT (omocodie): `^[A-Z]{6}[0-9LMNPQRSTUV]{2}[A-EHLMPR-T][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$`.
- Finestre Growth: riattivazione **90gg** (cooldown dormant **60gg**); recensioni completato **14gg** (cooldown review **180gg**); campagne cooldown **2 settimane**.
- Codice passaparola: `QRL` + 5 caratteri da alfabeto non ambiguo, generati con CSPRNG (`random_bytes`).
- Normalizzazione telefono: solo cifre; rimuovi `00` iniziale; se non inizia con `39` e ≤11 cifre anteponi `39`; valido se ≥11 cifre.
- Note cliniche **append-only**; firma **immutabile** (no update/delete); bucket firme **fuori** da `public/`.
- CSV fatture: separatore `;`, BOM UTF-8; export bloccato se manca il CF del professionista.
- Interfaccia in italiano (i18n it/en/es/fr con i `locales/*.json` esistenti); charmap senza em-dash.

## Review Focus

- **Isolamento cross-tenant:** una query/route di un terapista non deve mai restituire dati di un altro, anche con id esplicito in URL → 404/403. (Task 3)
- **Numerazione fatture concorrente:** due emissioni simultanee non devono produrre lo stesso `invoice_number` né saltare numeri. (Task 8)
- **Sovrapposizione agenda ai bordi:** appuntamenti adiacenti (`end == start`) sono validi; overlap parziale no; appuntamento annullato non blocca. (Task 6)
- **CF con omocodia e CF assente in fattura:** CF valido con lettere di controllo accettato; fattura senza CF paziente bloccata salvo override esplicito. (Task 4, Task 8)
- **Telefono non normalizzabile nel Growth:** numeri <11 cifre o vuoti esclusi senza crash; nessun dato sanitario nel messaggio. (Task 9)

---

## Task 1: Scaffold Laravel + Breeze + Inertia, design system e i18n

**Files:**
- Tag git `pre-laravel` sullo stato attuale, poi ristrutturazione di `careconnect/`.
- Create: progetto Laravel 11 standard (`composer.json`, `artisan`, `app/`, `routes/`, `resources/`, `database/`).
- Create: `resources/css/app.css` (da `src/styles.css`), `resources/js/app.tsx` (bootstrap Inertia).
- Modify: `resources/js/` ← porting `components/ui/*` (shadcn), `lib/i18n`, `locales/*.json`.
- Test: `tests/Feature/SmokeTest.php`.

**Interfaces:**
- Produces: app Laravel che builda e serve una pagina Inertia React con il tema teal e Plus Jakarta Sans; alias `@/*` → `resources/js/*`.

- [ ] **Step 1:** Creare il tag di salvataggio: `git tag pre-laravel && git commit` non serve (tag su HEAD attuale).
- [ ] **Step 2:** Scaffold Laravel 11 in una cartella temporanea, poi spostare i file in `careconnect/` conservando `docs/` e `.git/`. Installare Breeze: `composer require laravel/breeze --dev && php artisan breeze:install react` (stack Inertia+React, con opzione TypeScript).
- [ ] **Step 3:** Portare il design system: copiare i token teal in `resources/css/app.css`; impostare il font Plus Jakarta Sans; configurare Tailwind v4 su `resources/js/**`.
- [ ] **Step 4:** Portare `components/ui/*` (shadcn), `lib/i18n.ts` e `locales/{it,en,es,fr}.json` in `resources/js/`; configurare l'alias `@/*`.
- [ ] **Step 5: Scrivere lo smoke test**

```php
it('serves the landing page', function () {
    $this->get('/')->assertOk();
});
```

- [ ] **Step 6:** Eseguire `php artisan test --filter=SmokeTest` → PASS; `npm run build` → OK.
- [ ] **Step 7: Commit** `feat: scaffold Laravel + Breeze Inertia React con design system CareConnect`.

---

## Task 2: Modello Therapist + profilo + modulo Studio

**Files:**
- Modify: `app/Models/User.php` (rinominato concettualmente in Therapist; relazione profilo).
- Create: `app/Models/TherapistProfile.php`, migration `therapist_profiles`.
- Create: `app/Http/Controllers/StudioController.php`, `app/Http/Requests/UpdateStudioRequest.php`.
- Create: `app/Rules/FiscalCode.php`, `app/Rules/VatNumber.php`.
- Create: `resources/js/pages/Studio.tsx` (da `StudioTab.tsx`).
- Test: `tests/Feature/StudioTest.php`, `tests/Unit/FiscalCodeRuleTest.php`.

**Interfaces:**
- Consumes: auth Breeze (`auth()->user()`).
- Produces: `User->profile(): HasOne`; `FiscalCode` e `VatNumber` Rule riusabili; route `GET /studio`, `PUT /studio`.

- [ ] **Step 1: Test Rule CF**

```php
it('accepts a valid fiscal code and one with omocodia', function () {
    expect(validate('RSSMRA85T10A562S', new FiscalCode))->toBeTrue();
});
it('rejects a malformed fiscal code', function () {
    expect(validate('ABC', new FiscalCode))->toBeFalse();
});
```

- [ ] **Step 2:** Run → FAIL. Implementare `FiscalCode` e `VatNumber` (regex dai Global Constraints).
- [ ] **Step 3: Test Studio upsert**

```php
it('saves the therapist profile for the authenticated user only', function () {
    $t = User::factory()->create();
    $this->actingAs($t)->put('/studio', [
        'full_name' => 'Dr Rossi', 'studio_name' => 'Studio Rossi',
        'vat_number' => '12345678901',
    ])->assertRedirect();
    expect($t->profile->studio_name)->toBe('Studio Rossi');
});
```

- [ ] **Step 4:** Run → FAIL. Migration `therapist_profiles` (user_id pk/fk, full_name, studio_name, fiscal_code?, vat_number?, google_review_url?); `TherapistProfile` model; `StudioController@edit/update` con `UpdateStudioRequest` (google_review_url deve iniziare con `https://`); pagina `Studio.tsx`.
- [ ] **Step 5:** Run → PASS.
- [ ] **Step 6: Commit** `feat: profilo terapista + modulo Studio + Rule CF/P.IVA`.

---

## Task 3: Fondamenta di sicurezza — Global Scope OwnedByTherapist

**Files:**
- Create: `app/Models/Concerns/OwnedByTherapist.php` (trait: global scope + evento `creating`).
- Create: `app/Models/Patient.php` (primo consumatore, modello minimo).
- Create: migration `patients`.
- Test: `tests/Feature/TenantIsolationTest.php`.

**Interfaces:**
- Produces: trait `OwnedByTherapist` che (a) aggiunge `where therapist_id = auth()->id()` a ogni query e (b) imposta `therapist_id` su `creating`. Ogni modello di proprietà lo usa.

- [ ] **Step 1: Test isolamento (il cuore della sicurezza)**

```php
it('never returns another therapist\'s patients', function () {
    $a = User::factory()->create(); $b = User::factory()->create();
    $pa = Patient::factory()->for($a,'therapist')->create();
    $this->actingAs($b);
    expect(Patient::find($pa->id))->toBeNull();
    expect(Patient::count())->toBe(0);
});
it('sets therapist_id from the authenticated user on create', function () {
    $a = User::factory()->create();
    $this->actingAs($a);
    $p = Patient::create(['first_name'=>'Mario','last_name'=>'Rossi']);
    expect($p->therapist_id)->toBe($a->id);
});
```

- [ ] **Step 2:** Run → FAIL. Implementare il trait `OwnedByTherapist` (addGlobalScope + `static::creating`). Migration `patients` (tutti i campi da spec §4) con `therapist_id` fk e indice. `Patient` usa `HasUuids` + `OwnedByTherapist`, cast `tags` → array (JSON).
- [ ] **Step 3:** Run → PASS.
- [ ] **Step 4: Commit** `feat: isolamento per terapista via global scope (sostituisce la RLS)`.

---

## Task 4: Pazienti — CRUD e validazione

**Files:**
- Create: `app/Http/Controllers/PatientController.php`, `app/Http/Requests/StorePatientRequest.php`.
- Create: `app/Policies/PatientPolicy.php`.
- Create: `resources/js/pages/Patients/Index.tsx`, `resources/js/pages/Patients/Show.tsx` (da `PatientsTab.tsx`, `$patientId.tsx`).
- Test: `tests/Feature/PatientTest.php`.

**Interfaces:**
- Consumes: `OwnedByTherapist` (Task 3), `FiscalCode` (Task 2).
- Produces: route resource `patients` (index/store/show); props Inertia con lista pazienti + stato informativa/marketing.

- [ ] **Step 1: Test**

```php
it('creates a patient with lowercased tags and validated CF', function () {
    $this->actingAs(User::factory()->create())->post('/patients', [
        'first_name'=>'Mario','last_name'=>'Rossi','tags'=>'Schiena, Sport',
    ])->assertRedirect();
    expect(Patient::first()->tags)->toBe(['schiena','sport']);
});
it('rejects an invalid fiscal code', function () { /* assertSessionHasErrors('fiscal_code') */ });
```

- [ ] **Step 2:** Run → FAIL. Implementare controller resource, `StorePatientRequest` (CF opzionale validato, tag split+lowercase, referred_by_code opzionale), `PatientPolicy`, pagine Index/Show. Lista con ricerca, colonne nome/contatti/CF/stato informativa (Firmata/Da firmare)/stato marketing.
- [ ] **Step 3:** Run → PASS.
- [ ] **Step 4: Commit** `feat: modulo Pazienti (CRUD, ricerca, validazione)`.

---

## Task 5: Firma e consenso GDPR

**Files:**
- Create: `app/Services/SignatureService.php`, `app/Http/Controllers/SignatureController.php`.
- Create: `resources/js/components/SignaturePad.tsx`, `SignatureDialog.tsx` (portati).
- Test: `tests/Feature/SignatureTest.php`.

**Interfaces:**
- Consumes: `Patient` (Task 4).
- Produces: `POST /patients/{patient}/signature` (upload PNG + consensi); `GET /patients/{patient}/signature` (download protetto da policy).

- [ ] **Step 1: Test**

```php
it('stores the signature privately and records consent with the fixed version', function () {
    Storage::fake('local');
    $t = User::factory()->create(); $p = Patient::factory()->for($t,'therapist')->create();
    $this->actingAs($t)->post("/patients/{$p->id}/signature", [
        'image'=>UploadedFile::fake()->image('sig.png'), 'consent_marketing'=>false,
    ])->assertRedirect();
    $p->refresh();
    expect($p->consent_privacy)->toBeTrue();
    expect($p->consent_text_version)->toBe('v1.0-2026-11');
    Storage::disk('local')->assertExists($p->signature_path);
});
it('does not expose signatures under public/', function () { /* path starts with signatures/ on local disk */ });
```

- [ ] **Step 2:** Run → FAIL. `SignatureService::store(Patient, UploadedFile, bool $marketing)`: salva su `local` in `signatures/{therapistId}/{patientId}_{timestamp}.png` (no overwrite), aggiorna consensi (privacy + versione; marketing + data solo se true). Controller download con `PatientPolicy`. Nessuna route di update/delete. Canvas React con Pointer Events a risoluzione devicePixelRatio.
- [ ] **Step 3:** Run → PASS.
- [ ] **Step 4: Commit** `feat: firma touch + consenso GDPR (storage privato, immutabile)`.

---

## Task 6: Agenda — prenotazioni, anti-sovrapposizione, ICS

**Files:**
- Create: `app/Models/Appointment.php`, migration `appointments`.
- Create: `app/Services/AppointmentService.php`, `app/Http/Controllers/AppointmentController.php`.
- Create: `app/Support/Services.php` (costante servizi/durate), `app/Support/Ics.php`.
- Create: `resources/js/pages/Agenda.tsx` (da `AgendaTab.tsx`).
- Test: `tests/Feature/AppointmentTest.php`, `tests/Unit/IcsTest.php`.

**Interfaces:**
- Consumes: `OwnedByTherapist`, `Patient`.
- Produces: `AppointmentService::book(...)` che lancia overlap error; route prenotazione + azioni stato; export ICS.

- [ ] **Step 1: Test bordi overlap**

```php
it('allows back-to-back appointments but rejects partial overlap', function () {
    // 10:00-11:00 ok; poi 11:00-11:30 ok (adiacente); poi 10:30-11:15 → overlap error
});
it('ignores cancelled appointments when checking overlap', function () { /* ... */ });
```

- [ ] **Step 2:** Run → FAIL. Migration `appointments` (status enum, end>start a livello validazione); `AppointmentService::book` in transazione: overlap = esiste appt con `status<>cancelled` AND `start<newEnd` AND `end>newStart`. Servizi 60/30/45 + custom in `Support\Services`. Azioni Completato/Non presentato/Annulla. Default da oggi + opzione storico.
- [ ] **Step 3: Test ICS** (header `PRODID:-//CareConnect//Agenda//EN`, un VEVENT per appuntamento).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat: modulo Agenda (anti-overlap, stati, export ICS)`.

---

## Task 7: Cartella clinica — append-only

**Files:**
- Create: `app/Models/ClinicalNote.php`, migration `clinical_notes`.
- Create: `app/Http/Controllers/ClinicalNoteController.php`, `StoreClinicalNoteRequest.php`.
- Create: `resources/js/pages/Clinical.tsx` (da `ClinicalTab.tsx`).
- Test: `tests/Feature/ClinicalNoteTest.php`.

**Interfaces:**
- Consumes: `OwnedByTherapist`, `Patient`.
- Produces: route `index`/`store` soltanto (nessun update/delete).

- [ ] **Step 1: Test**

```php
it('requires at least one text field', function () { /* assertSessionHasErrors */ });
it('exposes no update or delete route for notes', function () {
    $this->actingAs(User::factory()->create())
        ->put("/clinical-notes/".Str::uuid())->assertStatus(405); // method not allowed
});
```

- [ ] **Step 2:** Run → FAIL. Migration + model; controller con solo index/store; `StoreClinicalNoteRequest` (almeno uno tra anamnesis/treatment_plan/session_notes). Elenco con data/ora, filtro per paziente.
- [ ] **Step 3:** Run → PASS.
- [ ] **Step 4: Commit** `feat: cartella clinica append-only`.

---

## Task 8: Fatture + TS — numerazione atomica e CSV

**Files:**
- Create: `app/Models/Invoice.php`, `app/Models/InvoiceCounter.php`, migrations.
- Create: `app/Services/InvoiceService.php`, `app/Http/Controllers/InvoiceController.php`.
- Create: `app/Services/InvoiceCsvExporter.php`.
- Create: `resources/js/pages/Invoices.tsx` (da `InvoicesTab.tsx`).
- Test: `tests/Feature/InvoiceTest.php`, `tests/Unit/InvoiceNumberingTest.php`, `tests/Feature/InvoiceCsvTest.php`.

**Interfaces:**
- Consumes: `OwnedByTherapist`, `Patient`, `TherapistProfile`.
- Produces: `InvoiceService::issue(Patient, int $total, int $cash, int $pos): Invoice`.

- [ ] **Step 1: Test numerazione e bollo**

```php
it('numbers invoices atomically and progressively per year', function () {
    $t = User::factory()->create(); $p = Patient::factory()->for($t,'therapist')->create();
    $this->actingAs($t);
    $y = date('Y');
    expect(app(InvoiceService::class)->issue($p, 5000, 5000, 0)->invoice_number)->toBe("$y/0001");
    expect(app(InvoiceService::class)->issue($p, 5000, 5000, 0)->invoice_number)->toBe("$y/0002");
});
it('flags stamp duty only above 77,47 euro', function () {
    // 7747 → false ; 7748 → true
});
it('rejects incoherent amounts (cash+pos != total)', function () { /* throws */ });
```

- [ ] **Step 2:** Run → FAIL. `InvoiceService::issue` in transazione con `lockForUpdate` sul counter (therapist_id, year), numero `Y/NNNN`, `stamp_duty_due = total>7747`, validazione importi. Controller: POS = total−cash (read-only lato FE); blocco se CF paziente non valido salvo override; nessun insert/update/delete diretto.
- [ ] **Step 3: Test CSV** (separatore `;`, BOM; blocco se manca CF professionista; colonne da spec §6.4).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5: Commit** `feat: fatture (numerazione atomica, bollo, export CSV)`.

---

## Task 9: Growth engine — 4 sotto-moduli

**Files:**
- Create: `app/Models/MarketingEvent.php`, `app/Models/ReferralCode.php`, migrations.
- Create: `app/Services/GrowthService.php`, `app/Support/Phone.php`, `app/Http/Controllers/GrowthController.php`.
- Create: `resources/js/pages/Growth.tsx` (da `growth/*`).
- Test: `tests/Unit/PhoneTest.php`, `tests/Feature/GrowthTest.php`.

**Interfaces:**
- Consumes: `Patient`, `Appointment`, `MarketingEvent`.
- Produces: `GrowthService::dormant()/reviews()/campaign($tag)`; `Phone::normalize(?string): ?string`; `ReferralCode` generator.

- [ ] **Step 1: Test normalizzazione telefono** (bordi: `00399...` → `39...`; `333...` 10 cifre → `39333...`; `<11` → null).
- [ ] **Step 2:** Run → FAIL. Implementare `Phone::normalize` (regole Global Constraints).
- [ ] **Step 3: Test segmenti Growth**

```php
it('lists dormant only with consent, >90d inactivity, no dormant contact in 60d', function () { /* ... */ });
it('lists review candidates completed within 14d, no review in 180d', function () { /* ... */ });
```

- [ ] **Step 4:** Run → FAIL. `GrowthService` con le finestre 90/60/14/180/14gg; mostra solo consenso marketing + telefono valido; registra `marketing_event` ad ogni apertura `wa.me`; generatore codice `QRL`+5 (CSPRNG). Campagne per tag + modello `{nome}/{studio}`. Nessun dato sanitario nei messaggi.
- [ ] **Step 5:** Run → PASS.
- [ ] **Step 6: Commit** `feat: Growth engine (riattivazione, recensioni, passaparola, campagne)`.

---

## Task 10: Oggi (dashboard) + Leads/Prevendita

**Files:**
- Create: `app/Models/PresaleLead.php`, migration `presale_leads`.
- Create: `app/Http/Controllers/TodayController.php`, `PresaleController.php`, `StorePresaleLeadRequest.php`.
- Create: `resources/js/pages/Today.tsx`, `resources/js/pages/Prevendita.tsx`, landing `pages/Welcome.tsx`.
- Test: `tests/Feature/TodayTest.php`, `tests/Feature/PresaleTest.php`.

**Interfaces:**
- Consumes: `Appointment`, `GrowthService`.
- Produces: `GET /app` (Oggi), `GET /prevendita`, `POST /prevendita` (pubblica).

- [ ] **Step 1: Test**

```php
it('shows today\'s appointments and growth-ready count', function () { /* ... */ });
it('accepts a public lead and ignores honeypot submissions', function () {
    $this->post('/prevendita', ['first_name'=>'A','last_name'=>'B','email'=>'a@b.it','profession'=>'osteopath','consent_privacy'=>true,'website'=>''])->assertRedirect();
    expect(PresaleLead::count())->toBe(1);
});
```

- [ ] **Step 2:** Run → FAIL. `presale_leads` pubblica (no scope) + honeypot nel controller; dashboard Oggi (appuntamenti del giorno + conteggio Growth); landing + SEO (title/meta CareConnect, dominio `careconnect.app`).
- [ ] **Step 3:** Run → PASS.
- [ ] **Step 4: Commit** `feat: dashboard Oggi + landing/prevendita (lead pubblici)`.

---

## Task 11: Hardening sicurezza + deploy Aruba

**Files:**
- Modify: registrazione policy (`AuthServiceProvider`), middleware `auth` su tutte le route riservate.
- Create: `.env.production.example`, `docs/deploy-aruba.md`.
- Test: `tests/Feature/RouteGuardTest.php`.

**Interfaces:**
- Consumes: tutti i moduli.
- Produces: configurazione di deploy per hosting condiviso.

- [ ] **Step 1: Test guardie route**

```php
it('blocks every reserved route for guests', function () {
    foreach (['/app','/patients','/agenda','/invoices','/growth','/studio'] as $u) {
        $this->get($u)->assertRedirect('/login');
    }
});
```

- [ ] **Step 2:** Run → FAIL. Applicare middleware `auth` + verificare che ogni modello di proprietà usi il trait e abbia policy. Lasciare pubbliche solo landing/prevendita/auth.
- [ ] **Step 3:** Run → PASS.
- [ ] **Step 4:** Scrivere `docs/deploy-aruba.md`: build locale (`composer install --no-dev -o`, `npm run build`, `config:cache`, `route:cache`), upload FTP, document root → `public/`, `.env` MySQL, migrazioni via phpMyAdmin o route one-shot protetta, `storage/app/private` scrivibile fuori da `public/`.
- [ ] **Step 5: Commit** `chore: hardening route + guida deploy Aruba`.

---

## Note di esecuzione

- Ogni task termina con `php artisan test` verde per i propri test e `npm run build` ok dove tocca il frontend.
- I componenti React si portano da `careconnect/` (tag `pre-laravel`) adattando il livello dati a Inertia.
- Mantenere i commit piccoli (uno per task) e la branch sempre in stato buildabile.
