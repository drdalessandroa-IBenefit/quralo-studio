<?php

use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(fn () => Carbon::setTestNow('2026-11-12 12:00:00'));

function tappt(User $t, Patient $p, $start, string $status = 'scheduled'): Appointment
{
    return Appointment::factory()->create([
        'therapist_id' => $t->id, 'patient_id' => $p->id, 'start_time' => $start,
        'end_time' => Carbon::parse($start)->addMinutes(30), 'status' => $status,
    ]);
}

it("shows today's appointments and growth-ready count", function () {
    $t = User::factory()->create();
    $this->actingAs($t);
    $p = Patient::factory()->create(['phone' => '3331234567', 'consent_marketing' => true]);
    tappt($t, $p, '2026-11-12 15:00:00');
    tappt($t, $p, '2026-11-13 10:00:00');
    // dormant patient (last visit 100d ago, consent + phone)
    $d = Patient::factory()->create(['phone' => '3339999999', 'consent_marketing' => true]);
    tappt($t, $d, now()->subDays(100), 'completed');

    $this->get('/app')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('Today')
        ->has('appointments', 1)
        ->where('growthReady', 1));
});

it('does not show other therapists appointments and requires auth', function () {
    $this->get('/app')->assertRedirect('/login');
    $a = User::factory()->create();
    $b = User::factory()->create();
    $this->actingAs($a);
    $p = Patient::factory()->create();
    $this->actingAs($b);
    $pb = Patient::factory()->create();
    tappt($b, $pb, '2026-11-12 15:00:00');
    $this->actingAs($a)->get('/app')->assertInertia(fn (Assert $page) => $page->has('appointments', 0));
});
