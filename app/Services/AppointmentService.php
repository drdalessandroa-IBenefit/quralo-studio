<?php

namespace App\Services;

use App\Exceptions\AppointmentOverlapException;
use App\Models\Appointment;
use App\Models\Patient;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class AppointmentService
{
    /**
     * Book an appointment. Overlap check + insert run in one transaction;
     * the therapist row is locked first so concurrent bookings of the same
     * therapist serialize (MySQL has no exclusion constraint).
     * Back-to-back (end == start) is allowed; cancelled appointments don't block.
     *
     * @throws AppointmentOverlapException
     */
    public function book(
        Patient $patient,
        CarbonInterface $start,
        CarbonInterface $end,
        ?string $serviceType = null,
        ?string $notes = null,
    ): Appointment {
        if ($end->lte($start)) {
            throw new InvalidArgumentException('end_time must be after start_time');
        }

        return DB::transaction(function () use ($patient, $start, $end, $serviceType, $notes) {
            DB::table('users')->where('id', auth()->id())->lockForUpdate()->value('id');

            $overlap = Appointment::query() // auto-scoped to the authenticated therapist
                ->where('status', '<>', 'cancelled')
                ->where('start_time', '<', $end)
                ->where('end_time', '>', $start)
                ->exists();

            if ($overlap) {
                throw new AppointmentOverlapException;
            }

            return Appointment::create([
                'patient_id' => $patient->id,
                'start_time' => $start,
                'end_time' => $end,
                'service_type' => $serviceType,
                'notes' => $notes,
            ]);
        });
    }
}
