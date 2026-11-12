<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TherapistProfile extends Model
{
    protected $primaryKey = 'user_id';

    public $incrementing = false;

    protected $fillable = ['user_id', 'full_name', 'studio_name', 'fiscal_code', 'vat_number', 'google_review_url'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
