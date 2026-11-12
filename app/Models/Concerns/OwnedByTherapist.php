<?php

namespace App\Models\Concerns;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tenant isolation (replaces Supabase RLS): every query is constrained to the
 * authenticated therapist, and therapist_id is forced on create.
 * Fails closed: with no authenticated user, queries match no rows.
 * Console/jobs must opt out explicitly with withoutGlobalScopes().
 */
trait OwnedByTherapist
{
    public static function bootOwnedByTherapist(): void
    {
        static::addGlobalScope('owned_by_therapist', function (Builder $builder) {
            $id = auth()->id();
            $table = $builder->getModel()->getTable();

            $id === null
                ? $builder->whereRaw('1 = 0')
                : $builder->where($table.'.therapist_id', $id);
        });

        static::creating(function ($model) {
            if (($id = auth()->id()) !== null) {
                $model->therapist_id = $id;
            }
        });
    }

    public function therapist(): BelongsTo
    {
        return $this->belongsTo(User::class, 'therapist_id');
    }
}
