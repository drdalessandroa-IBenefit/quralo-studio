# Deploy su hosting condiviso Aruba

Requisiti: PHP >= 8.2 (selezionabile dal pannello Aruba), MySQL, estensioni `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `gd`/`ctype` (standard).

## 1. Build in locale
```bash
composer install --no-dev --optimize-autoloader
npm ci && npm run build          # genera public/build
cp .env.production.example .env  # compila i valori (vedi sotto)
php artisan key:generate         # scrive APP_KEY in .env
php artisan config:cache
php artisan route:cache
php artisan view:cache
```
Non eseguire `config:cache` con un `.env` locale: la cache incorpora i valori, quindi usare quello di produzione.

## 2. Upload via FTP
Carica **tutto il progetto** (inclusi `vendor/`, `public/build`, `.env`) in una cartella **fuori** dalla document root, es. `/careconnect/`.
Escludi: `node_modules/`, `.git/`, `tests/`, `database/*.sqlite`, `storage/logs/*`.

## 3. Document root -> `public/`
Dal pannello Aruba (Gestione domini / Document root) imposta la radice del dominio su `/careconnect/public`.
Se il pannello non permette sottocartelle, sposta il contenuto di `public/` nella root web e modifica in `index.php` i percorsi `../vendor/autoload.php` e `../bootstrap/app.php` verso la cartella dell'app, che resta fuori dalla root web.
Mai esporre `.env`, `storage/`, `app/`, `vendor/` via web.

## 4. `.env` di produzione
Parti da `.env.production.example`: `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://...`, credenziali MySQL Aruba (host, database, utente, password dal pannello), `APP_KEY` generata, `APP_TIMEZONE=UTC`. Permessi file `.env`: 600/640 se possibile.

## 5. Migrazioni
**Opzione B (consigliata, primaria): import SQL da phpMyAdmin.** In locale, su un DB MySQL vuoto, esegui `php artisan migrate --force` e poi esporta lo schema (phpMyAdmin -> Esporta, oppure `mysqldump --no-data`); importalo dal phpMyAdmin Aruba (Importa). Include le tabelle `sessions`, `cache`, `jobs`.
Opzione A: se Aruba abilita l'accesso remoto a MySQL, punta temporaneamente `.env` locale al DB Aruba ed esegui `php artisan migrate --force`.
**Opzione C (ultima risorsa, solo se non hai alternative):** rotta one-shot temporanea. Attenzione: con `SESSION_DRIVER=database` e `CACHE_STORE=database` su un DB vuoto la tabella `sessions` non esiste ancora, quindi il middleware di sessione darebbe errore 500 prima di eseguire la rotta. Due accorgimenti obbligatori:
1. imposta temporaneamente nel `.env` di produzione `SESSION_DRIVER=file` e `CACHE_STORE=file` (e rigenera `config:cache`), poi **ripristina `database`** a migrazione conclusa;
2. registra la rotta senza sessione:
```php
Route::get('/_migrate/{token}', function (string $token) {
    $expected = (string) env('MIGRATE_TOKEN', '');
    abort_unless($expected !== '' && hash_equals($expected, $token), 404);
    Artisan::call('migrate', ['--force' => true]);
    return '<pre>'.e(Artisan::output()).'</pre>';
})->withoutMiddleware([\Illuminate\Session\Middleware\StartSession::class]);
```
`MIGRATE_TOKEN` lungo e casuale in `.env`. Nota: `env()` funziona solo con la config non in cache; se usi `config:cache` mappa il token in `config/app.php`. Dopo l'uso **rimuovi la rotta e il token**, ripristina i driver `database` e rigenera `route:cache`/`config:cache`.

## 6. Storage e firme (dati sanitari)
- `storage/` e `bootstrap/cache/` devono essere scrivibili (chmod 775/755 via FTP).
- Le firme stanno in `storage/app/private/`: **fuori da `public/`**. NON eseguire `php artisan storage:link` e non creare alcun symlink in `public/`. Le firme sono servite solo da `GET /patients/{patient}/signature` (autenticata, `Cache-Control: private, no-store`); il disco `local` ha `serve=false`.
- Verifica: `https://dominio/storage/...` deve rispondere 404, e `https://dominio/.env` non deve essere raggiungibile.
- Includi `storage/app/private` nei backup periodici (FTP/pannello) insieme al dump MySQL.

## 7. Vincoli hosting condiviso
- Niente worker/queue daemon, niente supervisor: `QUEUE_CONNECTION=sync`. Va bene: Growth e' manuale, nessun job in background.
- Niente scheduler garantito (cron limitato): l'app non ne dipende.
- Sessioni e cache su database (`SESSION_DRIVER=database`, `CACHE_STORE=database`; le tabelle sono nelle migrazioni).
- Forza HTTPS dal pannello Aruba (certificato SSL) e tieni `SESSION_SECURE_COOKIE=true`.
- Aggiornamenti: ripeti build locale e ricarica via FTP; dopo ogni deploy riesegui `config:cache`/`route:cache` in locale prima dell'upload.

## 8. Fallback VPS
Se servono worker, cron o shell: VPS (es. Aruba Cloud) con Nginx + PHP-FPM, root su `public/`, `composer install --no-dev`, `php artisan migrate --force`, `QUEUE_CONNECTION=database` con supervisor per `queue:work`, cron `* * * * * php artisan schedule:run`. Il resto della configurazione (storage privato, nessun symlink pubblico) resta identico.
