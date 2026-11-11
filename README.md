# CareConnect

SaaS verticale per **terapisti manuali** (osteopati, chinesiologi, fisioterapisti).
Non un gestionale passivo: un *Client Acquisition & Retention Engine* che riempie
l'agenda e aumenta il valore del paziente, oltre a gestire clinica e burocrazia.
Interfaccia in italiano, mobile-first (tablet e smartphone in studio).

## Stack

- **React 19** + **TanStack Start** (SSR) + **Vite**
- **Tailwind CSS v4** + **shadcn/ui** (Radix) — design system teal in `src/styles.css`
- **Supabase** (PostgreSQL, Auth, Storage) con Row Level Security
- **i18next** (it / en / es / fr)
- Test con **Vitest**

## Funzionalità (8 moduli)

| Modulo | Cosa fa |
|---|---|
| **Oggi** | Dashboard: appuntamenti del giorno + pazienti da ricontattare |
| **Pazienti + Firma** | Anagrafica, validazione codice fiscale IT, firma touch del consenso GDPR salvata come prova immutabile |
| **Agenda** | Prenotazioni con anti-sovrapposizione a livello DB, stati completato/no-show/annullato |
| **Cartella clinica** | Anamnesi, piano di trattamento, note di seduta (solo append) |
| **Fatture + TS** | Numerazione atomica, importi in centesimi, marca da bollo >77,47€, export CSV mensile |
| **Growth engine** | Riattivazione dormienti, recensioni Google, passaparola, campagne — messaggi WhatsApp inviati a mano dal terapista |
| **Studio** | Profilo professionista (CF, P.IVA, link recensioni) |
| **Leads / Prevendita** | Landing pubblica + raccolta lead |

## Sviluppo

Serve **Node.js** (o **Bun**).

```bash
# dipendenze
npm install            # con bun: bun install
# oppure, se npm segnala conflitti di peer-deps preesistenti:
npm install --legacy-peer-deps

# variabili d'ambiente
cp .env.example .env   # poi inserisci i valori Supabase

# avvio in sviluppo
npm run dev            # http://localhost:3000
```

### Script

| Comando | Azione |
|---|---|
| `npm run dev` | server di sviluppo |
| `npm run build` | build di produzione (Nitro) |
| `npm run preview` | anteprima della build |
| `npm test` | test (Vitest) |
| `npm run lint` | ESLint |

## Variabili d'ambiente

Vedi `.env.example`. Le chiavi `VITE_*` sono esposte al browser (URL e chiave
*publishable*, pensate per essere pubbliche); le altre sono solo lato server.

| Variabile | Uso |
|---|---|
| `VITE_SUPABASE_URL` / `SUPABASE_URL` | endpoint del progetto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY` | chiave pubblica |
| `SUPABASE_SERVICE_ROLE_KEY` | chiave service-role (solo server) |
| `DATABASE_MIGRATION_URL` | stringa di connessione Postgres per le migrazioni Drizzle |

## Database e sicurezza

Lo schema completo è in [`drizzle/migrations/`](drizzle/migrations/). Regole non
negoziabili (dati sanitari, GDPR):

1. **Row Level Security** su tutte le tabelle, isolamento per terapista (`auth.uid()`).
2. Il client non invia mai `therapist_id`: lo imposta il database (`default auth.uid()`).
3. Importi sempre interi in **centesimi**.
4. Le fatture si emettono solo via la funzione SQL `issue_invoice` (numerazione
   progressiva atomica per anno); il client non può inserire/modificare/cancellare fatture.
5. Note cliniche **append-only** (nessun update/delete): le correzioni sono nuove note.
6. Bucket storage `signatures` privato, cartella = `auth.uid()`, nessun update/delete
   (la firma è una prova immutabile).

## Deployment

La build usa **Nitro**: il preset di default è `node-server`. Per altri target:

```bash
NITRO_PRESET=node-server npm run build   # oppure vercel, cloudflare, ecc.
```

L'output è in `.output/` (`node .output/server/index.mjs` per il preset node).
