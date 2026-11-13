<?php

use App\Models\Invoice;
use App\Models\Patient;
use App\Models\User;
use App\Services\InvoiceService;

uses(Illuminate\Foundation\Testing\RefreshDatabase::class);

beforeEach(function () {
    $this->t = User::factory()->create();
    $this->actingAs($this->t);
    $this->p = Patient::factory()->create();
    $this->y = now('Europe/Rome')->year;
});

it('numbers invoices atomically and progressively per year', function () {
    expect(app(InvoiceService::class)->issue($this->p, 5000, 5000, 0)->invoice_number)->toBe("{$this->y}/0001");
    expect(app(InvoiceService::class)->issue($this->p, 5000, 5000, 0)->invoice_number)->toBe("{$this->y}/0002");
    expect(Invoice::count())->toBe(2);
});

it('keeps independent counters per therapist', function () {
    app(InvoiceService::class)->issue($this->p, 5000, 5000, 0);
    $other = User::factory()->create();
    $this->actingAs($other);
    $op = Patient::factory()->create();
    expect(app(InvoiceService::class)->issue($op, 100, 0, 100)->invoice_number)->toBe("{$this->y}/0001");
});

it('flags stamp duty only above 77,47 euro', function () {
    expect(app(InvoiceService::class)->issue($this->p, 7747, 7747, 0)->stamp_duty_due)->toBeFalse();
    expect(app(InvoiceService::class)->issue($this->p, 7748, 0, 7748)->stamp_duty_due)->toBeTrue();
});

it('rejects incoherent amounts (cash+pos != total)', function () {
    $s = app(InvoiceService::class);
    expect(fn () => $s->issue($this->p, 5000, 3000, 1000))->toThrow(InvalidArgumentException::class);
    expect(fn () => $s->issue($this->p, 0, 0, 0))->toThrow(InvalidArgumentException::class);
    expect(fn () => $s->issue($this->p, 5000, -100, 5100))->toThrow(InvalidArgumentException::class);
    expect(Invoice::count())->toBe(0);
});
