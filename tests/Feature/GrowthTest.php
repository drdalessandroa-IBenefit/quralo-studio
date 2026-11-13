<?php

use App\Models\Appointment;
use App\Models\MarketingEvent;
use App\Models\Patient;
use App\Models\ReferralCode;
use App\Models\TherapistProfile;
use App\Models\User;
use App\Services\GrowthService;
use Illuminate\Support\Carbon;

beforeEach(function () {
    Carbon::setTestNow('2026-11-12 12:00:00');
    $this->t = User::factory()->create();
    $this->actingAs($this->t);
});

function gpatient(array $o = []): Patient
{
    return Patient::factory()->create($o + ['phone' => '3331234567', 'consent_marketing' => true]);
}

function gappt(Patient $p, int $daysAgo, string $status = 'completed'): Appointment
{
    $s = now()->subDays($daysAgo);

    return Appointment::factory()->create([
        'patient_id' => $p->id, 'start_time' => $s, 'end_time' => $s->copy()->addMinutes(30), 'status' => $status,
    ]);
}

function gevent(Patient $p, string $type, int $daysAgo): void
{
    MarketingEvent::create(['patient_id' => $p->id, 'type' => $type, 'sent_at' => now()->subDays($daysAgo)]);
}

it('lists dormant only with consent, >90d inactivity, no dormant contact in 60d', function () {
    $ok = gpatient(['first_name' => 'Ok']);
    gappt($ok, 91);
    $recent = gpatient(); gappt($recent, 89);
    $future = gpatient(); gappt($future, 120); gappt($future, -3, 'scheduled');
    $none = gpatient(); // no appointments: not dormant
    $onlyCancelled = gpatient(); gappt($onlyCancelled, 200, 'cancelled');
    $noConsent = gpatient(['consent_marketing' => false]); gappt($noConsent, 120);
    $noPhone = gpatient(['phone' => '123']); gappt($noPhone, 120);
    $cooldown = gpatient(); gappt($cooldown, 120); gevent($cooldown, 'dormant', 59);
    $cooledOff = gpatient(['first_name' => 'Cool']); gappt($cooledOff, 120); gevent($cooledOff, 'dormant', 61);
    $otherType = gpatient(['first_name' => 'Other']); gappt($otherType, 120); gevent($otherType, 'review', 5);
    $cancelledRecent = gpatient(['first_name' => 'CancRecent']); gappt($cancelledRecent, 120); gappt($cancelledRecent, 5, 'cancelled');

    $svc = app(GrowthService::class);
    expect($svc->dormant()->pluck('first_name')->sort()->values()->all())
        ->toBe(collect(['Ok', 'Cool', 'Other', 'CancRecent'])->sort()->values()->all());
    expect($svc->dormantExcludedNoConsent())->toBe(1);
});

it('lists review candidates completed within 14d, no review in 180d', function () {
    $ok = gpatient(['first_name' => 'Ok']); gappt($ok, 13);
    $old = gpatient(); gappt($old, 15);
    $sched = gpatient(); gappt($sched, 2, 'scheduled');
    $reviewed = gpatient(); gappt($reviewed, 3); gevent($reviewed, 'review', 179);
    $reviewedOld = gpatient(['first_name' => 'Old']); gappt($reviewedOld, 3); gevent($reviewedOld, 'review', 181);
    $noConsent = gpatient(['consent_marketing' => false]); gappt($noConsent, 3);
    $noPhone = gpatient(['phone' => null]); gappt($noPhone, 3);

    expect(app(GrowthService::class)->reviews()->pluck('first_name')->sort()->values()->all())
        ->toBe(['Ok', 'Old']);
});

it('builds campaign segment by tag excluding contacted in 2 weeks', function () {
    $a = gpatient(['first_name' => 'A', 'tags' => ['vip']]);
    $b = gpatient(['first_name' => 'B', 'tags' => ['vip']]); gevent($b, 'campaign', 13);
    $c = gpatient(['first_name' => 'C', 'tags' => ['vip']]); gevent($c, 'campaign', 15);
    gpatient(['first_name' => 'D', 'tags' => ['other']]);
    gpatient(['first_name' => 'E', 'tags' => ['vip'], 'consent_marketing' => false]);

    expect(app(GrowthService::class)->campaign('vip')->pluck('first_name')->sort()->values()->all())
        ->toBe(['A', 'C']);
});

it('renders the growth page with segments and studio info', function () {
    $p = gpatient(); gappt($p, 120);
    TherapistProfile::create(['user_id' => $this->t->id, 'studio_name' => 'Studio X']);

    $this->get('/growth')->assertOk()->assertInertia(fn ($page) => $page
        ->component('Growth')
        ->has('dormant', 1)
        ->where('studio', 'Studio X')
        ->where('dormant.0.phone', '393331234567'));
});

it('logs a marketing event per wa.me open and refuses non-consenting patients', function () {
    $p = gpatient();
    $this->post('/growth/events', ['patient_id' => $p->id, 'type' => 'dormant'])->assertRedirect();
    expect(MarketingEvent::where('patient_id', $p->id)->where('type', 'dormant')->count())->toBe(1);

    $bad = gpatient(['consent_marketing' => false]);
    $this->post('/growth/events', ['patient_id' => $bad->id, 'type' => 'dormant'])->assertStatus(422);
    $this->post('/growth/events', ['patient_id' => $p->id, 'type' => 'bogus'])->assertSessionHasErrors('type');
    expect(MarketingEvent::count())->toBe(1);
});

it('cannot log events for another therapist patient', function () {
    $other = User::factory()->create();
    $this->actingAs($other);
    $p = Patient::factory()->create(['phone' => '3331234567', 'consent_marketing' => true]);
    $this->actingAs($this->t)->post('/growth/events', ['patient_id' => $p->id, 'type' => 'review'])->assertStatus(404);
});

it('generates one QRL referral code per patient and counts referrals', function () {
    $p = gpatient();
    $this->post('/growth/referral-codes', ['patient_id' => $p->id])->assertRedirect();
    $this->post('/growth/referral-codes', ['patient_id' => $p->id])->assertRedirect();

    $codes = ReferralCode::all();
    expect($codes)->toHaveCount(1);
    expect($codes[0]->code)->toMatch('/^QRL[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/');

    gpatient(['referred_by_code' => $codes[0]->code]);
    gpatient(['referred_by_code' => $codes[0]->code]);
    $this->get('/growth')->assertOk()->assertInertia(fn ($page) => $page
        ->where('referrals.0.code', $codes[0]->code)->where('referrals.0.uses', 2));
});
