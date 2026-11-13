<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\TherapistProfile;
use RuntimeException;

/**
 * Monthly CSV for the accountant. NOT the official Sistema TS XML layout.
 * Separator ';', UTF-8 BOM, dd/mm/yyyy dates, amounts in euros (comma decimal).
 */
class InvoiceCsvExporter
{
    public const HEADER = [
        'CF professionista', 'CF paziente', 'Data', 'Numero documento',
        'Importo', 'Contanti', 'POS', 'Bollo dovuto',
    ];

    /** @throws RuntimeException when the professional's fiscal code is missing */
    public function export(int $therapistId, int $year, int $month): string
    {
        $cf = TherapistProfile::query()->where('user_id', $therapistId)->value('fiscal_code');
        if (! is_string($cf) || trim($cf) === '') {
            throw new RuntimeException('Professional fiscal code missing');
        }
        $cf = strtoupper(trim($cf));

        $from = sprintf('%04d-%02d-01', $year, $month);
        $to = date('Y-m-d', strtotime("$from +1 month"));

        $invoices = Invoice::query() // auto-scoped to the authenticated therapist
            ->with('patient')
            ->where('issued_at', '>=', $from)->where('issued_at', '<', $to)
            ->orderBy('issued_at')->orderBy('invoice_number')
            ->get();

        $h = fopen('php://temp', 'r+');
        fwrite($h, "\xEF\xBB\xBF");
        fputcsv($h, self::HEADER, ';', '"', '');
        foreach ($invoices as $i) {
            fputcsv($h, [
                $cf,
                strtoupper((string) $i->patient?->fiscal_code),
                $i->issued_at->format('d/m/Y'),
                $i->invoice_number,
                $this->euro($i->total_cents),
                $this->euro($i->cash_cents),
                $this->euro($i->pos_cents),
                $i->stamp_duty_due ? 'SI' : 'NO',
            ], ';', '"', '');
        }
        rewind($h);
        $out = stream_get_contents($h);
        fclose($h);

        return $out;
    }

    private function euro(int $cents): string
    {
        return number_format($cents / 100, 2, ',', '');
    }
}
