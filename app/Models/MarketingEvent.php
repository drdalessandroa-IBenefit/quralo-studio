<?php

namespace App\Models;

use App\Models\Concerns\OwnedByTherapist;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class MarketingEvent extends Model
{
    use HasUuids, OwnedByTherapist;

    public const TYPES = ['dormant', 'review', 'campaign'];

    protected $fillable = ['patient_id', 'type', 'sent_at'];

    protected function casts(): array
    {
        return ['sent_at' => 'datetime'];
    }
}
