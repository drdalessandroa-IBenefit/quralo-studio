<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Per-(therapist, year) progressive counter. Composite key: accessed via where() only. */
class InvoiceCounter extends Model
{
    protected $primaryKey = null;

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = ['therapist_id', 'year', 'last_number'];
}
