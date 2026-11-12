<?php

namespace Database\Factories;

use App\Models\Appointment;
use App\Models\Patient;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Appointment> */
class AppointmentFactory extends Factory
{
    protected $model = Appointment::class;

    public function definition(): array
    {
        $start = now()->addDay()->setTime(10, 0);

        return [
            'patient_id' => Patient::factory(),
            'start_time' => $start,
            'end_time' => $start->copy()->addMinutes(30),
        ];
    }
}
