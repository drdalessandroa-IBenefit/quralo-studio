<?php

namespace App\Models;

use App\Models\Concerns\OwnedByTherapist;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Append-only: notes are only created, never updated or deleted by the app. */
class ClinicalNote extends Model
{
    use HasUuids, OwnedByTherapist;

    public const UPDATED_AT = null;

    protected $fillable = ['patient_id', 'anamnesis', 'treatment_plan', 'session_notes'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
