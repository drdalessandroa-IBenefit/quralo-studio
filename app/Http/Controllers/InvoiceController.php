<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Patient;
use App\Models\TherapistProfile;
use App\Rules\FiscalCode;
use App\Services\InvoiceCsvExporter;
use App\Services\InvoiceService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;
use RuntimeException;

/** Issue + list + CSV export only. Invoices are never updated or deleted. */
class InvoiceController extends Controller
{
    public function index(): Response
    {
        $hasCf = TherapistProfile::query()->where('user_id', auth()->id())->whereNotNull('fiscal_code')->where('fiscal_code', '<>', '')->exists();

        return Inertia::render('Invoices', [
            'invoices' => Invoice::query()->with('patient')->latest('issued_at')->latest('invoice_number')->get()
                ->map(fn (Invoice $i) => [
                    'id' => $i->id,
                    'invoice_number' => $i->invoice_number,
                    'issued_at' => $i->issued_at->toDateString(),
                    'patient_name' => $i->patient ? $i->patient->first_name.' '.$i->patient->last_name : '',
                    'total_cents' => $i->total_cents,
                    'cash_cents' => $i->cash_cents,
                    'pos_cents' => $i->pos_cents,
                    'stamp_duty_due' => $i->stamp_duty_due,
                ])->all(),
            'patients' => Patient::query()->orderBy('last_name')->orderBy('first_name')
                ->get(['id', 'first_name', 'last_name', 'fiscal_code'])
                ->map(fn (Patient $p) => [
                    'id' => $p->id,
                    'first_name' => $p->first_name,
                    'last_name' => $p->last_name,
                    'has_valid_cf' => $this->validCf($p->fiscal_code),
                ])->all(),
            'professionalCf' => $hasCf,
        ]);
    }

    public function store(Request $request, InvoiceService $service): RedirectResponse
    {
        $data = $request->validate([
            'patient_id' => ['required', 'uuid'],
            'total_cents' => ['required', 'integer', 'min:1'],
            'cash_cents' => ['required', 'integer', 'min:0'],
            'allow_without_cf' => ['sometimes', 'boolean'],
        ]);

        $patient = Patient::find($data['patient_id']); // auto-scoped
        if (! $patient) {
            return back()->withErrors(['patient_id' => 'Paziente non valido.']);
        }
        if (! $this->validCf($patient->fiscal_code) && ! ($data['allow_without_cf'] ?? false)) {
            return back()->withErrors(['fiscal_code' => 'Codice fiscale del paziente mancante o non valido.']);
        }

        $pos = $data['total_cents'] - $data['cash_cents']; // POS = total - cash
        try {
            $service->issue($patient, $data['total_cents'], $data['cash_cents'], $pos);
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['cash_cents' => 'Importi non coerenti.']);
        }

        return back();
    }

    public function export(Request $request, InvoiceCsvExporter $exporter): HttpResponse|RedirectResponse
    {
        $v = Validator::make($request->query(), [
            'year' => ['required', 'integer', 'between:2000,2100'],
            'month' => ['required', 'integer', 'between:1,12'],
        ]);
        if ($v->fails()) {
            return back()->withErrors($v);
        }
        [$year, $month] = [(int) $request->query('year'), (int) $request->query('month')];

        try {
            $csv = $exporter->export((int) auth()->id(), $year, $month);
        } catch (RuntimeException $e) {
            return back()->withErrors(['export' => 'Imposta il codice fiscale del professionista nello Studio per esportare.']);
        }

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => sprintf('attachment; filename="fatture-%04d-%02d.csv"', $year, $month),
        ]);
    }

    private function validCf(?string $cf): bool
    {
        return $cf !== null && $cf !== '' && Validator::make(['cf' => strtoupper($cf)], ['cf' => [new FiscalCode]])->passes();
    }
}
