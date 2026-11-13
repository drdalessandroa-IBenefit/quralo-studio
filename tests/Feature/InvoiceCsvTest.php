<?php

use App\Models\Patient;
use App\Models\TherapistProfile;
use App\Models\User;
use App\Services\InvoiceService;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
    $this->y = now('Europe/Rome')->year;
    $this->m = now('Europe/Rome')->month;
});

it('blocks export when the professional CF is missing', function () {
    $this->get("/invoices/export.csv?year={$this->y}&month={$this->m}")->assertSessionHasErrors('export');
    TherapistProfile::create(['user_id' => $this->user->id, 'fiscal_code' => '']);
    $this->get("/invoices/export.csv?year={$this->y}&month={$this->m}")->assertSessionHasErrors('export');
});

it('exports a monthly ; separated CSV with BOM and spec columns', function () {
    TherapistProfile::create(['user_id' => $this->user->id, 'fiscal_code' => 'VRDGPP70B02F205X']);
    $p = Patient::factory()->create(['fiscal_code' => 'RSSMRA80A01H501U']);
    app(InvoiceService::class)->issue($p, 7748, 2000, 5748);

    $res = $this->get("/invoices/export.csv?year={$this->y}&month={$this->m}")->assertOk();
    $body = $res->streamedContent ?? $res->getContent();
    expect(str_starts_with($body, "\xEF\xBB\xBF"))->toBeTrue();
    $lines = array_values(array_filter(explode("\n", str_replace("\r", '', substr($body, 3)))));
    expect(str_getcsv($lines[0], ';', '"', ''))->toBe(['CF professionista', 'CF paziente', 'Data', 'Numero documento', 'Importo', 'Contanti', 'POS', 'Bollo dovuto']);
    expect(substr_count($lines[0], ';'))->toBe(7);
    $date = now('Europe/Rome')->format('d/m/Y');
    expect($lines[1])->toBe("VRDGPP70B02F205X;RSSMRA80A01H501U;$date;{$this->y}/0001;77,48;20,00;57,48;SI");
    expect($lines)->toHaveCount(2);
});

it('excludes invoices from other months', function () {
    TherapistProfile::create(['user_id' => $this->user->id, 'fiscal_code' => 'VRDGPP70B02F205X']);
    $p = Patient::factory()->create();
    app(InvoiceService::class)->issue($p, 5000, 5000, 0);
    $other = $this->m === 1 ? 2 : 1;
    $body = $this->get("/invoices/export.csv?year={$this->y}&month=$other")->getContent();
    expect(count(array_filter(explode("\n", substr($body, 3)))))->toBe(1);
});
