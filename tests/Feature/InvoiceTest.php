<?php

use App\Http\Controllers\InvoiceController;
use App\Models\Invoice;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

it('issues an invoice computing POS = total - cash', function () {
    $p = Patient::factory()->create(['fiscal_code' => 'RSSMRA80A01H501U']);
    $this->post('/invoices', ['patient_id' => $p->id, 'total_cents' => 9000, 'cash_cents' => 4000])->assertRedirect();
    $i = Invoice::first();
    expect($i->pos_cents)->toBe(5000)->and($i->stamp_duty_due)->toBeTrue()->and($i->therapist_id)->toBe($this->user->id);
});

it('blocks patients without a valid CF unless overridden', function () {
    $p = Patient::factory()->create(['fiscal_code' => null]);
    $this->post('/invoices', ['patient_id' => $p->id, 'total_cents' => 5000, 'cash_cents' => 5000])
        ->assertSessionHasErrors('fiscal_code');
    expect(Invoice::count())->toBe(0);
    $this->post('/invoices', ['patient_id' => $p->id, 'total_cents' => 5000, 'cash_cents' => 5000, 'allow_without_cf' => true])
        ->assertSessionHasNoErrors();
    expect(Invoice::count())->toBe(1);
});

it('rejects cash above total', function () {
    $p = Patient::factory()->create(['fiscal_code' => 'RSSMRA80A01H501U']);
    $this->post('/invoices', ['patient_id' => $p->id, 'total_cents' => 5000, 'cash_cents' => 6000])
        ->assertSessionHasErrors('cash_cents');
    expect(Invoice::count())->toBe(0);
});

it('exposes no update or delete for invoices', function () {
    $id = Str::uuid();
    $this->put("/invoices/$id")->assertStatus(405);
    $this->patch("/invoices/$id")->assertStatus(405);
    $this->delete("/invoices/$id")->assertStatus(405);
    expect(method_exists(InvoiceController::class, 'update'))->toBeFalse()
        ->and(method_exists(InvoiceController::class, 'destroy'))->toBeFalse();
});

it('does not issue for another therapist\'s patient', function () {
    $foreign = Patient::factory()->create();
    DB::table('patients')->where('id', $foreign->id)->update(['therapist_id' => User::factory()->create()->id]);
    $this->post('/invoices', ['patient_id' => $foreign->id, 'total_cents' => 5000, 'cash_cents' => 5000, 'allow_without_cf' => true])
        ->assertSessionHasErrors('patient_id');
    expect(Invoice::count())->toBe(0);
});

it('renders the invoices page', function () {
    $this->get('/invoices')->assertOk();
});

it('rejects absurd amounts with a validation error', function () {
    $p = Patient::factory()->create(['fiscal_code' => 'RSSMRA80A01H501U']);
    $this->post('/invoices', ['patient_id' => $p->id, 'total_cents' => 100000000, 'cash_cents' => 0])
        ->assertSessionHasErrors('total_cents');
    $this->post('/invoices', ['patient_id' => $p->id, 'total_cents' => 5000, 'cash_cents' => 100000000])
        ->assertSessionHasErrors('cash_cents');
    expect(Invoice::count())->toBe(0);
});
