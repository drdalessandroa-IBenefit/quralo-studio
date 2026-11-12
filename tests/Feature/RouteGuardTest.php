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

it('has no unauthenticated route beyond the exact public allowlist', function () {
    $public = ['/', 'prevendita', 'login', 'register', 'forgot-password', 'reset-password/{token}', 'reset-password', 'up', 'sanctum/csrf-cookie'];
    $checked = 0;
    foreach (app('router')->getRoutes() as $route) {
        $uri = $route->uri();
        if (in_array($uri, $public, true)) {
            continue;
        }
        $guarded = collect($route->gatherMiddleware())
            ->contains(fn ($m) => is_string($m) && str_starts_with($m, 'auth'));
        expect($guarded)->toBeTrue("route $uri lacks auth middleware");
        $checked++;
    }
    expect($checked)->toBeGreaterThan(20);
});
