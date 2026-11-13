<?php

use App\Models\PresaleLead;

function lead(array $o = []): array
{
    return $o + ['first_name' => 'A', 'last_name' => 'B', 'email' => 'a@b.it', 'profession' => 'osteopath',
        'consent_privacy' => true, 'website' => ''];
}

it('serves the public landing and prevendita without auth', function () {
    $this->get('/')->assertOk();
    $this->get('/prevendita')->assertOk();
});

it('accepts a public lead and redirects', function () {
    $this->post('/prevendita', lead())->assertRedirect();
    expect(PresaleLead::count())->toBe(1);
    expect(PresaleLead::first()->consent_privacy)->toBeTrue();
});

it('silently ignores honeypot submissions (success, no row)', function () {
    $this->post('/prevendita', lead(['website' => 'http://spam']))->assertRedirect()->assertSessionHasNoErrors();
    expect(PresaleLead::count())->toBe(0);
});

it('requires consent, valid profession and email', function () {
    $this->post('/prevendita', lead(['consent_privacy' => false]))->assertSessionHasErrors('consent_privacy');
    $this->post('/prevendita', lead(['profession' => 'x']))->assertSessionHasErrors('profession');
    $this->post('/prevendita', lead(['email' => 'nope']))->assertSessionHasErrors('email');
    expect(PresaleLead::count())->toBe(0);
});
