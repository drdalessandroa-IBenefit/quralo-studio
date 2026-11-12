<?php

namespace App\Models;

use App\Models\Concerns\OwnedByTherapist;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    use HasFactory, HasUuids, OwnedByTherapist;

    public const STATUSES = ['scheduled', 'completed', 'cancelled', 'no_show'];

    protected $fillable = ['patient_id', 'start_time', 'end_time', 'status', 'service_type', 'notes'];

    protected $attributes = ['status' => 'scheduled'];

    protected function casts(): array
    {
        return ['start_time' => 'datetime', 'end_time' => 'datetime'];
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class);
    }
}
