<?php

namespace App\Models;

use App\Models\Concerns\OwnedByTherapist;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralCode extends Model
{
    use HasUuids, OwnedByTherapist;

    protected $fillable = ['patient_id', 'code'];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
