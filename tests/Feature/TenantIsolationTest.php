<?php

use App\Models\Patient;
use App\Models\User;

it('never returns another therapist\'s patients', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $pa = Patient::factory()->for($a, 'therapist')->create();
    $this->actingAs($b);
    expect(Patient::find($pa->id))->toBeNull();
    expect(Patient::count())->toBe(0);
});

it('sets therapist_id from the authenticated user on create', function () {
    $a = User::factory()->create();
    $this->actingAs($a);
    $p = Patient::create(['first_name' => 'Mario', 'last_name' => 'Rossi']);
    expect($p->therapist_id)->toBe($a->id);
    expect(strlen($p->id))->toBe(36);
});

it('ignores a therapist_id supplied by the caller when authenticated', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $this->actingAs($a);
    $p = new Patient(['first_name' => 'X', 'last_name' => 'Y']);
    $p->therapist_id = $b->id;
    $p->save();
    expect($p->fresh()->therapist_id)->toBe($a->id);
});

it('lets each therapist see only their own patients', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    Patient::factory()->for($a, 'therapist')->count(2)->create();
    Patient::factory()->for($b, 'therapist')->create();
    $this->actingAs($a);
    expect(Patient::count())->toBe(2);
    $this->actingAs($b);
    expect(Patient::count())->toBe(1);
});

it('blocks cross-therapist update, delete and findOrFail', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $pa = Patient::factory()->for($a, 'therapist')->create(['first_name' => 'Orig']);
    $this->actingAs($b);
    expect(Patient::whereKey($pa->id)->update(['first_name' => 'Hacked']))->toBe(0);
    expect(Patient::whereKey($pa->id)->delete())->toBe(0);
    expect(fn () => Patient::findOrFail($pa->id))
        ->toThrow(Illuminate\Database\Eloquent\ModelNotFoundException::class);
    $this->actingAs($a);
    expect(Patient::find($pa->id)->first_name)->toBe('Orig');
});

it('returns nothing when unauthenticated (fails closed)', function () {
    $a = User::factory()->create();
    Patient::factory()->for($a, 'therapist')->create();
    expect(Patient::count())->toBe(0);
});

it('casts tags to array', function () {
    $a = User::factory()->create();
    $this->actingAs($a);
    $p = Patient::create(['first_name' => 'M', 'last_name' => 'R', 'tags' => ['ansia', 'adulto']]);
    expect($p->fresh()->tags)->toBe(['ansia', 'adulto']);
});

it('keeps the tenant constraint AND-combined when a consumer appends a top-level orWhere', function () {
    $a = User::factory()->create();
    $b = User::factory()->create();
    $pa = Patient::factory()->for($a, 'therapist')->create(['first_name' => 'Anna', 'email' => 'anna@example.com']);
    $this->actingAs($b);
    Patient::factory()->for($b, 'therapist')->create(['first_name' => 'Bruno', 'email' => 'bruno@example.com']);

    $results = Patient::where('first_name', 'like', '%Bruno%')
        ->orWhere('email', 'like', '%anna@example.com%')
        ->get();

    expect($results->pluck('id')->all())->not->toContain($pa->id);
    expect($results)->toHaveCount(1);
    expect(Patient::where('first_name', 'zzz')->orWhere('id', $pa->id)->count())->toBe(0);
});
