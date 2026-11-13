<?php

use App\Models\User;
use Illuminate\Support\Facades\Storage;

test('deleting the account removes the user signature files', function () {
    Storage::fake('local');
    $user = User::factory()->create();
    $other = User::factory()->create();
    Storage::disk('local')->put("signatures/{$user->id}/x.png", 'png');
    Storage::disk('local')->put("signatures/{$other->id}/y.png", 'png');

    $this->actingAs($user)
        ->delete('/profile', ['password' => 'password'])
        ->assertRedirect('/');

    Storage::disk('local')->assertMissing("signatures/{$user->id}/x.png");
    expect(Storage::disk('local')->exists("signatures/{$user->id}"))->toBeFalse();
    Storage::disk('local')->assertExists("signatures/{$other->id}/y.png");
    $this->assertNull($user->fresh());
});
