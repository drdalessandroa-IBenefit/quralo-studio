<?php

use App\Models\User;

it('saves the therapist profile for the authenticated user only', function () {
    $t = User::factory()->create();
    $other = User::factory()->create();

    $this->actingAs($t)->put('/studio', [
        'full_name' => 'Dr Rossi', 'studio_name' => 'Studio Rossi',
        'vat_number' => '12345678901',
    ])->assertRedirect();

    expect($t->fresh()->profile->studio_name)->toBe('Studio Rossi');
    expect($other->fresh()->profile)->toBeNull();
});

it('updates an existing profile instead of duplicating it', function () {
    $t = User::factory()->create();
    $this->actingAs($t)->put('/studio', ['full_name' => 'A', 'studio_name' => 'S1']);
    $this->actingAs($t)->put('/studio', ['full_name' => 'A', 'studio_name' => 'S2']);

    expect($t->fresh()->profile->studio_name)->toBe('S2');
    expect(\App\Models\TherapistProfile::count())->toBe(1);
});

it('uppercases the fiscal code and validates fields', function () {
    $t = User::factory()->create();
    $this->actingAs($t)->put('/studio', ['full_name' => 'A', 'fiscal_code' => 'rssmra85t10a562s'])->assertRedirect();
    expect($t->fresh()->profile->fiscal_code)->toBe('RSSMRA85T10A562S');

    $this->actingAs($t)->put('/studio', ['full_name' => 'A', 'vat_number' => '123', 'google_review_url' => 'http://x.it'])
        ->assertSessionHasErrors(['vat_number', 'google_review_url']);
});

it('requires auth and renders the page', function () {
    $this->get('/studio')->assertRedirect('/login');
    $this->actingAs(User::factory()->create())->get('/studio')->assertOk();
});
