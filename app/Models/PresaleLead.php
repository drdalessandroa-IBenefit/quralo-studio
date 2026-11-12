<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Public lead (anonymous visitors): intentionally NOT tenant-scoped, no OwnedByTherapist. */
class PresaleLead extends Model
{
    use HasUuids;

    public const PROFESSIONS = ['osteopath', 'kinesiologist', 'physiotherapist', 'other'];

    protected $fillable = ['first_name', 'last_name', 'email', 'phone', 'profession', 'consent_privacy'];

    protected function casts(): array
    {
        return ['consent_privacy' => 'boolean'];
    }
}
