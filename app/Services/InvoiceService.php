<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\InvoiceCounter;
use App\Models\Patient;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class InvoiceService
{
    /** Stamp duty applies strictly above 77.47 EUR. */
    public const STAMP_DUTY_THRESHOLD_CENTS = 7747;

    /**
     * Issue an invoice with an atomic, progressive per-year number (Y/NNNN).
     * The counter row (therapist_id, year) is locked inside the transaction so
     * concurrent issues serialize. Amounts are integer cents.
     *
     * @throws InvalidArgumentException on incoherent amounts
     */
    public function issue(Patient $patient, int $totalCents, int $cashCents, int $posCents): Invoice
    {
        if ($totalCents <= 0) {
            throw new InvalidArgumentException('total must be greater than zero');
        }
        if ($cashCents < 0 || $posCents < 0) {
            throw new InvalidArgumentException('cash and pos must not be negative');
        }
        if ($cashCents + $posCents !== $totalCents) {
            throw new InvalidArgumentException('cash + pos must equal total');
        }

        $therapistId = auth()->id();
        if ($therapistId === null) {
            throw new InvalidArgumentException('an authenticated therapist is required');
        }

        $issuedAt = now('Europe/Rome')->startOfDay();
        $year = $issuedAt->year;

        return DB::transaction(function () use ($patient, $totalCents, $cashCents, $posCents, $therapistId, $issuedAt, $year) {
            // Make sure the row exists, then lock it for the read-increment-write.
            InvoiceCounter::query()->insertOrIgnore([
                'therapist_id' => $therapistId, 'year' => $year, 'last_number' => 0,
            ]);

            $last = (int) InvoiceCounter::query()
                ->where('therapist_id', $therapistId)->where('year', $year)
                ->lockForUpdate()
                ->value('last_number');
            $next = $last + 1;

            InvoiceCounter::query()
                ->where('therapist_id', $therapistId)->where('year', $year)
                ->update(['last_number' => $next]);

            return Invoice::create([
                'patient_id' => $patient->id,
                'invoice_number' => sprintf('%d/%04d', $year, $next),
                'issued_at' => $issuedAt->toDateString(),
                'total_cents' => $totalCents,
                'cash_cents' => $cashCents,
                'pos_cents' => $posCents,
                'stamp_duty_due' => $totalCents > self::STAMP_DUTY_THRESHOLD_CENTS,
            ]);
        });
    }
}
