<?php

namespace App\Models;

use App\Models\Concerns\OwnedByTherapist;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Issue-only: created exclusively by InvoiceService, never updated or deleted by the app. */
class Invoice extends Model
{
    use HasUuids, OwnedByTherapist;

    public const UPDATED_AT = null;

    protected $fillable = [
        'patient_id', 'invoice_number', 'issued_at', 'total_cents', 'cash_cents', 'pos_cents', 'stamp_duty_due',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'date',
            'total_cents' => 'integer',
            'cash_cents' => 'integer',
            'pos_cents' => 'integer',
            'stamp_duty_due' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
