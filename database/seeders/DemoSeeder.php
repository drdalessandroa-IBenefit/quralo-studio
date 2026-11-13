<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\ClinicalNote;
use App\Models\MarketingEvent;
use App\Models\Patient;
use App\Models\PresaleLead;
use App\Models\TherapistProfile;
use App\Models\User;
use App\Services\InvoiceService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

/**
 * Dati dimostrativi per far provare l'app (login pronto + dati in ogni modulo).
 * Idempotente: se il terapista demo ha già pazienti, non duplica nulla.
 *
 * Login demo:  demo@careconnect.it  /  careconnect
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $therapist = User::firstOrCreate(
            ['email' => 'demo@careconnect.it'],
            ['name' => 'Dr. Marco Bianchi', 'password' => Hash::make('careconnect')],
        );

        TherapistProfile::updateOrCreate(
            ['user_id' => $therapist->id],
            [
                'full_name' => 'Dr. Marco Bianchi',
                'studio_name' => 'Studio CareConnect (Demo)',
                'fiscal_code' => 'BNCMRC80A01F839K',
                'vat_number' => '12345678903',
                'google_review_url' => 'https://g.page/r/studio-careconnect-demo/review',
            ],
        );

        // Isolamento per terapista: autenticandoci, il trait OwnedByTherapist
        // imposta therapist_id su ogni record e applica il global scope.
        Auth::login($therapist);

        if (Patient::count() > 0) {
            $this->command?->info('DemoSeeder: dati demo già presenti, salto la popolazione.');
            Auth::logout();
            $this->seedPresaleLeads();

            return;
        }

        $patients = $this->seedPatients();
        $this->seedAppointments($patients);
        $this->seedClinicalNotes($patients);
        $this->seedInvoices($patients);
        $this->seedMarketingEvents($patients);

        Auth::logout();

        $this->seedPresaleLeads();

        $this->command?->info('DemoSeeder: login demo@careconnect.it / careconnect');
    }

    /** @return array<string, Patient> */
    private function seedPatients(): array
    {
        $now = now('Europe/Rome');

        $defs = [
            ['Giulia', 'Rossi', 'giulia.rossi@example.it', '+39 333 1122334', 'LBLGLI90B41H501Q', ['lombalgia'], true],
            ['Luca', 'Ferrari', 'luca.ferrari@example.it', '+39 334 5566778', 'FRRLCU85C10A944R', ['cervicalgia', 'sportivo'], true],
            ['Sara', 'Conti', 'sara.conti@example.it', '+39 320 9988776', 'CNTSRA92D55F205T', ['gravidanza'], false],
            ['Marco', 'Esposito', 'marco.esposito@example.it', '+39 347 1234567', 'SPSMRC78E12F839V', ['postura'], true],
            ['Elena', 'Greco', 'elena.greco@example.it', '+39 339 7654321', 'GRCLNE95F48L219M', ['emicrania'], false],
        ];

        $patients = [];
        foreach ($defs as [$first, $last, $email, $phone, $cf, $tags, $marketing]) {
            $patients[$first] = Patient::create([
                'first_name' => $first,
                'last_name' => $last,
                'email' => $email,
                'phone' => $phone,
                'fiscal_code' => $cf,
                'tags' => $tags,
                'consent_privacy' => true,
                'consent_date' => $now->copy()->subDays(rand(10, 120)),
                'consent_text_version' => 'v1.0-2026-11',
                'consent_marketing' => $marketing,
                'consent_marketing_date' => $marketing ? $now->copy()->subDays(rand(10, 120)) : null,
            ]);
        }

        return $patients;
    }

    /** @param array<string, Patient> $patients */
    private function seedAppointments(array $patients): void
    {
        $base = now('Europe/Rome')->startOfDay();

        $slots = [
            // [paziente, giorni da oggi, ora, durata minuti, stato, servizio]
            ['Giulia', -14, 10, 60, 'completed', 'Prima visita osteopatica'],
            ['Giulia', -2, 11, 45, 'completed', 'Trattamento osteopatico'],
            ['Luca', -7, 9, 45, 'completed', 'Trattamento osteopatico'],
            ['Sara', -1, 15, 60, 'completed', 'Prima visita osteopatica'],
            ['Marco', 0, 16, 30, 'scheduled', 'Controllo'],
            ['Giulia', 1, 10, 45, 'scheduled', 'Trattamento osteopatico'],
            ['Luca', 2, 9, 45, 'scheduled', 'Trattamento osteopatico'],
            ['Elena', 3, 17, 60, 'scheduled', 'Prima visita osteopatica'],
            ['Sara', 6, 15, 45, 'scheduled', 'Trattamento osteopatico'],
        ];

        foreach ($slots as [$name, $offsetDays, $hour, $minutes, $status, $service]) {
            $start = $base->copy()->addDays($offsetDays)->setTime($hour, 0);
            Appointment::create([
                'patient_id' => $patients[$name]->id,
                'start_time' => $start,
                'end_time' => $start->copy()->addMinutes($minutes),
                'status' => $status,
                'service_type' => $service,
                'notes' => null,
            ]);
        }
    }

    /** @param array<string, Patient> $patients */
    private function seedClinicalNotes(array $patients): void
    {
        ClinicalNote::create([
            'patient_id' => $patients['Giulia']->id,
            'anamnesis' => 'Lombalgia acuta insorta dopo sollevamento carico. Nessun deficit neurologico.',
            'treatment_plan' => 'Ciclo di 4 sedute osteopatiche a cadenza settimanale + esercizi domiciliari.',
            'session_notes' => 'Trattamento tecniche a energia muscolare su tratto lombare. Buona risposta.',
        ]);

        ClinicalNote::create([
            'patient_id' => $patients['Luca']->id,
            'anamnesis' => 'Cervicalgia da postura al lavoro, atleta amatoriale (corsa).',
            'treatment_plan' => 'Mobilizzazione cervicale + rieducazione posturale.',
            'session_notes' => 'Prima seduta: riduzione tensione trapezi. Rivalutazione tra 7 giorni.',
        ]);
    }

    /** @param array<string, Patient> $patients */
    private function seedInvoices(array $patients): void
    {
        $service = app(InvoiceService::class);

        // Sotto soglia bollo (77,47 €): niente marca da bollo.
        $service->issue($patients['Giulia'], 5000, 5000, 0);

        // Sopra soglia bollo: scatta il bollo, incasso misto contanti + POS.
        $service->issue($patients['Luca'], 12000, 5000, 7000);
    }

    /** @param array<string, Patient> $patients */
    private function seedMarketingEvents(array $patients): void
    {
        MarketingEvent::create([
            'patient_id' => $patients['Giulia']->id,
            'type' => 'review',
            'sent_at' => now('Europe/Rome')->subDays(3),
        ]);

        MarketingEvent::create([
            'patient_id' => $patients['Marco']->id,
            'type' => 'dormant',
            'sent_at' => now('Europe/Rome')->subDays(20),
        ]);
    }

    private function seedPresaleLeads(): void
    {
        if (PresaleLead::count() > 0) {
            return;
        }

        $leads = [
            ['Chiara', 'Moretti', 'chiara.moretti@example.it', '+39 331 2223344', 'osteopath'],
            ['Davide', 'Villa', 'davide.villa@example.it', '+39 338 5556677', 'physiotherapist'],
            ['Federica', 'Gallo', 'federica.gallo@example.it', '+39 340 8889900', 'kinesiologist'],
        ];

        foreach ($leads as [$first, $last, $email, $phone, $profession]) {
            PresaleLead::create([
                'first_name' => $first,
                'last_name' => $last,
                'email' => $email,
                'phone' => $phone,
                'profession' => $profession,
                'consent_privacy' => true,
            ]);
        }
    }
}
