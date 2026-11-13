<?php

namespace App\Policies;

use App\Models\Appointment;
use App\Models\User;

class AppointmentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Appointment $appointment): bool
    {
        return $appointment->therapist_id === $user->id;
    }

    public function update(User $user, Appointment $appointment): bool
    {
        return $appointment->therapist_id === $user->id;
    }
}
