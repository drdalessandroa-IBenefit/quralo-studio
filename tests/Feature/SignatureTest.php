<?php

use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

function sigPng(): UploadedFile
{
    return UploadedFile::fake()->image('sig.png');
}

it('stores the signature privately and records consent with the fixed version', function () {
    Storage::fake('local');
    $t = User::factory()->create();
    $p = Patient::factory()->for($t, 'therapist')->create();

    $this->actingAs($t)->post("/patients/{$p->id}/signature", [
        'image' => sigPng(), 'consent_marketing' => false,
    ])->assertRedirect();

    $p->refresh();
    expect($p->consent_privacy)->toBeTrue();
    expect($p->consent_date)->not->toBeNull();
    expect($p->consent_text_version)->toBe('v1.0-2026-11');
    expect($p->consent_marketing)->toBeFalse();
    expect($p->consent_marketing_date)->toBeNull();
    Storage::disk('local')->assertExists($p->signature_path);
});

it('records marketing consent only when ticked', function () {
    Storage::fake('local');
    $t = User::factory()->create();
    $p = Patient::factory()->for($t, 'therapist')->create();

    $this->actingAs($t)->post("/patients/{$p->id}/signature", [
        'image' => sigPng(), 'consent_marketing' => true,
    ])->assertRedirect();

    $p->refresh();
    expect($p->consent_marketing)->toBeTrue();
    expect($p->consent_marketing_date)->not->toBeNull();
});

it('does not expose signatures under public/', function () {
    Storage::fake('local');
    $t = User::factory()->create();
    $p = Patient::factory()->for($t, 'therapist')->create();

    $this->actingAs($t)->post("/patients/{$p->id}/signature", ['image' => sigPng()]);
    $p->refresh();

    expect($p->signature_path)->toMatch("#^signatures/{$t->id}/{$p->id}_\d+\.png$#");
    Storage::disk('public')->assertMissing($p->signature_path);
    expect(config('filesystems.disks.local.root'))->not->toContain('public');
    expect(config('filesystems.disks.local.url'))->toBeNull();
    expect(config('filesystems.links'))->not->toHaveKey(public_path('signatures'));
});

it('rejects a missing or non-png signature', function () {
    Storage::fake('local');
    $t = User::factory()->create();
    $p = Patient::factory()->for($t, 'therapist')->create();

    $this->actingAs($t)->post("/patients/{$p->id}/signature", [])->assertSessionHasErrors('image');
    $this->actingAs($t)->post("/patients/{$p->id}/signature", [
        'image' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf'),
    ])->assertSessionHasErrors('image');
    expect($p->refresh()->signature_path)->toBeNull();
});

it('does not allow overwriting an existing signature', function () {
    Storage::fake('local');
    $t = User::factory()->create();
    $p = Patient::factory()->for($t, 'therapist')->create();

    $this->actingAs($t)->post("/patients/{$p->id}/signature", ['image' => sigPng()])->assertRedirect();
    $first = $p->refresh()->signature_path;

    $this->actingAs($t)->post("/patients/{$p->id}/signature", ['image' => sigPng()])->assertStatus(409);
    expect($p->refresh()->signature_path)->toBe($first);
    expect(Storage::disk('local')->allFiles('signatures'))->toHaveCount(1);
});

it('lets only the owning therapist download the signature', function () {
    Storage::fake('local');
    $t = User::factory()->create();
    $other = User::factory()->create();
    $p = Patient::factory()->for($t, 'therapist')->create();
    $this->actingAs($t)->post("/patients/{$p->id}/signature", ['image' => sigPng()]);

    $this->actingAs($t)->get("/patients/{$p->id}/signature")
        ->assertOk()->assertHeader('content-type', 'image/png');

    auth()->logout();
    $this->actingAs($other)->get("/patients/{$p->id}/signature")->assertNotFound();
    $this->actingAs($other)->post("/patients/{$p->id}/signature", ['image' => sigPng()])->assertNotFound();
});

it('requires authentication and 404s when no signature exists', function () {
    $t = User::factory()->create();
    $p = Patient::factory()->for($t, 'therapist')->create();

    $this->get("/patients/{$p->id}/signature")->assertRedirect('/login');
    $this->actingAs($t)->get("/patients/{$p->id}/signature")->assertNotFound();
});

it('has no update or delete routes for signatures', function () {
    foreach (Route::getRoutes() as $route) {
        if (str_contains($route->uri(), 'signature')) {
            expect(array_diff($route->methods(), ['GET', 'HEAD', 'POST']))->toBe([]);
        }
    }
});

it('closes the race: a stale unsigned copy cannot overwrite an existing signature', function () {
    Storage::fake('local');
    $t = User::factory()->create();
    $p = Patient::factory()->for($t, 'therapist')->create();
    $this->actingAs($t);
    $stale = Patient::findOrFail($p->id); // both requests passed the "unsigned" check
    $service = app(App\Services\SignatureService::class);

    $service->store($p, sigPng(), true);
    $first = $p->refresh()->signature_path;
    $date = $p->consent_date;

    expect(fn () => $service->store($stale, sigPng(), false))
        ->toThrow(App\Exceptions\SignatureAlreadyRecorded::class);

    $p->refresh();
    expect($p->signature_path)->toBe($first);
    expect($p->consent_marketing)->toBeTrue();
    expect($p->consent_date->equalTo($date))->toBeTrue();
    expect(Storage::disk('local')->allFiles('signatures'))->toHaveCount(1);
});
