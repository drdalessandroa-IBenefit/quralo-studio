<?php

it('redirects guests from every reserved route to login', function () {
    foreach (['/app', '/patients', '/agenda', '/agenda/export.ics', '/clinical-notes', '/invoices', '/invoices/export.csv', '/growth', '/studio', '/profile'] as $u) {
        $this->get($u)->assertRedirect('/login');
    }
    $id = '00000000-0000-0000-0000-000000000000';
    $this->get("/patients/$id")->assertRedirect('/login');
    $this->get("/patients/$id/signature")->assertRedirect('/login');
    $this->post("/patients/$id/signature")->assertRedirect('/login');
    $this->post('/patients')->assertRedirect('/login');
    $this->post('/agenda')->assertRedirect('/login');
    $this->patch("/agenda/$id/status")->assertRedirect('/login');
    $this->post('/clinical-notes')->assertRedirect('/login');
    $this->post('/invoices')->assertRedirect('/login');
    $this->post('/growth/events')->assertRedirect('/login');
    $this->post('/growth/referral-codes')->assertRedirect('/login');
    $this->put('/studio')->assertRedirect('/login');
    $this->delete('/profile')->assertRedirect('/login');
});

it('keeps landing, presale and auth pages public', function () {
    foreach (['/', '/prevendita', '/login', '/register', '/forgot-password'] as $u) {
        $this->get($u)->assertOk();
    }
});

it('has no unauthenticated route beyond the public allowlist', function () {
    $public = ['/', 'prevendita', 'login', 'register', 'forgot-password', 'reset-password/{token}', 'reset-password'];
    foreach (app('router')->getRoutes() as $route) {
        $uri = $route->uri();
        if (in_array($uri, $public, true) || str_starts_with($uri, 'up') || str_starts_with($uri, 'storage/') || str_starts_with($uri, 'verify-email') || $uri === 'email/verification-notification' || in_array($uri, ['logout', 'confirm-password', 'password', 'sanctum/csrf-cookie'], true)) {
            continue;
        }
        expect(in_array('auth', $route->gatherMiddleware(), true))->toBeTrue("route $uri lacks auth");
    }
});
