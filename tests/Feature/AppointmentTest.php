<?php

use App\Exceptions\AppointmentOverlapException;
use App\Models\Appointment;
use App\Models\Patient;
use App\Models\User;
use App\Services\AppointmentService;
use Illuminate\Support\Carbon;

function slot(string $from, string $to): array
{
    return [Carbon::parse("2030-05-06 $from"), Carbon::parse("2030-05-06 $to")];
}

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
    $this->patient = Patient::factory()->create();
    $this->svc = app(AppointmentService::class);
});

it('allows back-to-back appointments but rejects partial overlap', function () {
    $this->svc->book($this->patient, ...slot('10:00', '11:00'));
    $this->svc->book($this->patient, ...slot('11:00', '11:30')); // adjacent: end == start
    expect(Appointment::count())->toBe(2);

    expect(fn () => $this->svc->book($this->patient, ...slot('10:30', '11:15')))
        ->toThrow(AppointmentOverlapException::class);
    expect(Appointment::count())->toBe(2);
});

it('also allows a slot ending exactly when another starts', function () {
    $this->svc->book($this->patient, ...slot('10:00', '11:00'));
    $this->svc->book($this->patient, ...slot('09:30', '10:00'));
    expect(Appointment::count())->toBe(2);
});

it('rejects contained and containing intervals', function () {
    $this->svc->book($this->patient, ...slot('10:00', '11:00'));
    expect(fn () => $this->svc->book($this->patient, ...slot('10:15', '10:45')))->toThrow(AppointmentOverlapException::class);
    expect(fn () => $this->svc->book($this->patient, ...slot('09:00', '12:00')))->toThrow(AppointmentOverlapException::class);
    expect(fn () => $this->svc->book($this->patient, ...slot('10:00', '11:00')))->toThrow(AppointmentOverlapException::class);
});

it('ignores cancelled appointments when checking overlap', function () {
    $a = $this->svc->book($this->patient, ...slot('10:00', '11:00'));
    $a->update(['status' => 'cancelled']);
    $this->svc->book($this->patient, ...slot('10:15', '10:45'));
    expect(Appointment::count())->toBe(2);
});

it('does not let another therapist block my slot', function () {
    $other = User::factory()->create();
    $this->actingAs($other);
    $op = Patient::factory()->create();
    $this->svc->book($op, ...slot('10:00', '11:00'));

    $this->actingAs($this->user);
    $this->svc->book($this->patient, ...slot('10:00', '11:00'));
    expect(Appointment::count())->toBe(1);
});

it('rejects end <= start', function () {
    expect(fn () => $this->svc->book($this->patient, ...slot('11:00', '11:00')))->toThrow(InvalidArgumentException::class);
});

it('books via HTTP with service duration and returns a friendly error on overlap', function () {
    $this->post('/agenda', ['patient_id' => $this->patient->id, 'service_type' => 'prima_visita', 'start_time' => '2030-05-06T10:00:00Z'])
        ->assertRedirect()->assertSessionHasNoErrors();
    $a = Appointment::first();
    expect($a->start_time->diffInMinutes($a->end_time))->toEqual(60)
        ->and($a->therapist_id)->toBe($this->user->id)->and($a->status)->toBe('scheduled');

    $this->post('/agenda', ['patient_id' => $this->patient->id, 'service_type' => 'controllo', 'start_time' => '2030-05-06T10:30:00Z'])
        ->assertSessionHasErrors('start_time'); // not a 500
    $this->post('/agenda', ['patient_id' => $this->patient->id, 'service_type' => 'controllo', 'start_time' => '2030-05-06T11:00:00Z'])
        ->assertSessionHasNoErrors();
    expect(Appointment::count())->toBe(2);
});

it('validates custom duration and unknown services', function () {
    $base = ['patient_id' => $this->patient->id, 'start_time' => '2030-05-06T10:00:00Z'];
    $this->post('/agenda', $base + ['service_type' => 'custom'])->assertSessionHasErrors('minutes');
    $this->post('/agenda', $base + ['service_type' => 'custom', 'minutes' => 7])->assertSessionHasErrors('minutes');
    $this->post('/agenda', $base + ['service_type' => 'nope'])->assertSessionHasErrors('service_type');
    $this->post('/agenda', $base + ['service_type' => 'custom', 'minutes' => 25])->assertSessionHasNoErrors();
    expect(Appointment::first()->start_time->diffInMinutes(Appointment::first()->end_time))->toEqual(25);
});

it('refuses another therapist\'s patient', function () {
    $other = User::factory()->create();
    $this->actingAs($other);
    $foreign = Patient::factory()->create();
    $this->actingAs($this->user);
    $this->post('/agenda', ['patient_id' => $foreign->id, 'service_type' => 'controllo', 'start_time' => '2030-05-06T10:00:00Z'])
        ->assertSessionHasErrors('patient_id');
    expect(Appointment::count())->toBe(0);
});

it('applies status actions and blocks re-activating', function () {
    $a = $this->svc->book($this->patient, ...slot('10:00', '11:00'));
    $this->patch("/agenda/{$a->id}/status", ['status' => 'no_show'])->assertSessionHasNoErrors();
    expect($a->fresh()->status)->toBe('no_show');
    $this->patch("/agenda/{$a->id}/status", ['status' => 'cancelled'])->assertSessionHasErrors('status');
    $this->patch("/agenda/{$a->id}/status", ['status' => 'scheduled'])->assertSessionHasErrors('status');
});

it('cannot change status of another therapist\'s appointment', function () {
    $other = User::factory()->create();
    $this->actingAs($other);
    $a = $this->svc->book(Patient::factory()->create(), ...slot('10:00', '11:00'));
    $this->actingAs($this->user);
    $this->patch("/agenda/{$a->id}/status", ['status' => 'cancelled'])->assertNotFound();
    $this->get("/agenda/{$a->id}/ics")->assertNotFound();
});

it('lists from today onward by default and includes history on request', function () {
    Appointment::factory()->create(['patient_id' => $this->patient->id, 'start_time' => now()->subDays(3), 'end_time' => now()->subDays(3)->addMinutes(30)]);
    Appointment::factory()->create(['patient_id' => $this->patient->id, 'start_time' => now()->addDays(2), 'end_time' => now()->addDays(2)->addMinutes(30)]);

    $this->get('/agenda')->assertInertia(fn ($p) => $p->component('Agenda')->has('appointments', 1));
    $this->get('/agenda?history=1')->assertInertia(fn ($p) => $p->has('appointments', 2));
});

it('exports ICS excluding cancelled appointments', function () {
    $a = $this->svc->book($this->patient, ...slot('10:00', '11:00'));
    $b = $this->svc->book($this->patient, ...slot('12:00', '12:30'));
    $b->update(['status' => 'cancelled']);
    $res = $this->get('/agenda/export.ics?history=1')->assertOk();
    expect($res->headers->get('Content-Type'))->toContain('text/calendar');
    $body = $res->getContent();
    expect(substr_count($body, 'BEGIN:VEVENT'))->toBe(1)->and($body)->toContain('PRODID:-//CareConnect//Agenda//EN');
    $this->get("/agenda/{$a->id}/ics")->assertOk();
});

it('requires auth', function () {
    auth()->logout();
    $this->get('/agenda')->assertRedirect('/login');
});
