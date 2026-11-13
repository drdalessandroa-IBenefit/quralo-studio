<?php

use App\Http\Controllers\ClinicalNoteController;
use App\Models\ClinicalNote;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
    $this->patient = Patient::factory()->create();
});

it('requires at least one text field', function () {
    $this->post('/clinical-notes', ['patient_id' => $this->patient->id])
        ->assertSessionHasErrors('anamnesis');
    $this->post('/clinical-notes', ['patient_id' => $this->patient->id, 'anamnesis' => '   ', 'session_notes' => ''])
        ->assertSessionHasErrors('anamnesis');
    expect(ClinicalNote::count())->toBe(0);
});

it('exposes no update or delete route for notes', function () {
    $id = Str::uuid();
    $this->put("/clinical-notes/$id")->assertStatus(405);
    $this->patch("/clinical-notes/$id")->assertStatus(405);
    $this->delete("/clinical-notes/$id")->assertStatus(405);
    expect(method_exists(ClinicalNoteController::class, 'update'))->toBeFalse()
        ->and(method_exists(ClinicalNoteController::class, 'destroy'))->toBeFalse();
});

it('stores a note for an owned patient', function () {
    $this->post('/clinical-notes', ['patient_id' => $this->patient->id, 'session_notes' => 'Ok'])
        ->assertRedirect();
    $n = ClinicalNote::first();
    expect($n->therapist_id)->toBe($this->user->id)
        ->and($n->session_notes)->toBe('Ok')
        ->and($n->anamnesis)->toBeNull();
});

it('rejects a patient of another therapist', function () {
    $other = User::factory()->create();
    $this->actingAs($other);
    $foreign = Patient::factory()->create();
    $this->actingAs($this->user);
    $this->post('/clinical-notes', ['patient_id' => $foreign->id, 'anamnesis' => 'x'])
        ->assertSessionHasErrors('patient_id');
    expect(ClinicalNote::withoutGlobalScopes()->count())->toBe(0);
});

it('lists only own notes and filters by patient', function () {
    $p2 = Patient::factory()->create();
    ClinicalNote::create(['patient_id' => $this->patient->id, 'anamnesis' => 'one']);
    ClinicalNote::create(['patient_id' => $p2->id, 'anamnesis' => 'two']);
    $other = User::factory()->create();
    $this->actingAs($other);
    $op = Patient::factory()->create();
    ClinicalNote::create(['patient_id' => $op->id, 'anamnesis' => 'foreign']);
    $this->actingAs($this->user);

    $this->get('/clinical-notes')->assertInertia(fn ($p) => $p
        ->component('Clinical')->has('notes', 2));
    $this->get('/clinical-notes?patient_id='.$p2->id)->assertInertia(fn ($p) => $p
        ->has('notes', 1)->where('notes.0.anamnesis', 'two'));
});

it('refuses to update or delete a note at model level', function () {
    $note = ClinicalNote::create(['patient_id' => $this->patient->id, 'anamnesis' => 'orig']);
    expect($note->update(['anamnesis' => 'changed']))->toBeFalse()
        ->and($note->delete())->toBeFalse();
    expect(ClinicalNote::count())->toBe(1)
        ->and(ClinicalNote::first()->anamnesis)->toBe('orig');
});
