<?php

namespace App\Models;

use App\Models\Concerns\OwnedByTherapist;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    use HasFactory, HasUuids, OwnedByTherapist;

    protected $fillable = [
        'first_name', 'last_name', 'email', 'phone', 'fiscal_code', 'tags',
        'referred_by_code', 'consent_privacy', 'consent_date', 'consent_text_version',
        'signature_path', 'consent_marketing', 'consent_marketing_date',
    ];

    protected $attributes = ['tags' => '[]'];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'consent_privacy' => 'boolean',
            'consent_marketing' => 'boolean',
            'consent_date' => 'datetime',
            'consent_marketing_date' => 'datetime',
        ];
    }

    public function clinicalNotes(): HasMany
    {
        return $this->hasMany(ClinicalNote::class);
    }
}
