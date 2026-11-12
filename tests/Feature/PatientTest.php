<?php

use App\Models\Patient;
use App\Models\User;

it('creates a patient with lowercased tags and validated CF', function () {
    $u = User::factory()->create();
    $this->actingAs($u)->post('/patients', [
        'first_name' => 'Mario', 'last_name' => 'Rossi', 'tags' => 'Schiena, Sport',
        'fiscal_code' => 'rssmra85t10a562s',
    ])->assertRedirect();

    $p = Patient::first();
    expect($p->tags)->toBe(['schiena', 'sport']);
    expect($p->fiscal_code)->toBe('RSSMRA85T10A562S');
    expect($p->therapist_id)->toBe($u->id);
});

it('stores empty tags as an empty array', function () {
    $this->actingAs(User::factory()->create())->post('/patients', [
        'first_name' => 'A', 'last_name' => 'B', 'tags' => ' , ',
    ])->assertRedirect();
    expect(Patient::first()->tags)->toBe([]);
});

it('rejects an invalid fiscal code', function () {
    $this->actingAs(User::factory()->create())->post('/patients', [
        'first_name' => 'Mario', 'last_name' => 'Rossi', 'fiscal_code' => 'INVALID',
    ])->assertSessionHasErrors('fiscal_code');
    expect(Patient::count())->toBe(0);
});

it('requires names and ignores a client-sent therapist_id', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $this->actingAs($a)->post('/patients', ['first_name' => ''])->assertSessionHasErrors(['first_name', 'last_name']);
    $this->actingAs($a)->post('/patients', ['first_name' => 'X', 'last_name' => 'Y', 'therapist_id' => $b->id]);
    expect(Patient::first()->therapist_id)->toBe($a->id);
});

it('requires authentication', function () {
    $this->get('/patients')->assertRedirect('/login');
    $this->post('/patients', [])->assertRedirect('/login');
});

it('lists and searches only own patients, with consent status', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    Patient::factory()->for($a, 'therapist')->create(['first_name' => 'Mario', 'last_name' => 'Rossi']);
    Patient::factory()->for($a, 'therapist')->create(['first_name' => 'Luca', 'last_name' => 'Bianchi', 'consent_privacy' => true, 'signature_path' => 'sig.png']);
    Patient::factory()->for($b, 'therapist')->create(['first_name' => 'Mario', 'last_name' => 'Altro']);

    $this->actingAs($a)->get('/patients?search=mario')->assertInertia(fn ($page) => $page
        ->component('Patients/Index')
        ->has('patients', 1)
        ->where('patients.0.last_name', 'Rossi')
        ->where('patients.0.privacy_signed', false));

    $this->actingAs($a)->get('/patients')->assertInertia(fn ($page) => $page
        ->has('patients', 2)->where('patients.0.privacy_signed', true));
});

it('cannot leak across tenants with a wildcard search', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    Patient::factory()->for($b, 'therapist')->create(['first_name' => 'Segreto']);
    $this->actingAs($a)->get('/patients?search=%25')->assertInertia(fn ($page) => $page->has('patients', 0));
});

it('shows own patient and 404s for another therapist\'s', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $mine = Patient::factory()->for($a, 'therapist')->create();
    $theirs = Patient::factory()->for($b, 'therapist')->create();

    $this->actingAs($a)->get("/patients/{$mine->id}")->assertOk();
    $this->actingAs($a)->get("/patients/{$theirs->id}")->assertNotFound();
});
