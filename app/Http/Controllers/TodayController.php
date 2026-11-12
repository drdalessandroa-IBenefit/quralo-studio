<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Services\GrowthService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TodayController extends Controller
{
    public function __construct(private GrowthService $growth) {}

    public function index(Request $request): Response
    {
        $appointments = Appointment::with('patient')
            ->whereBetween('start_time', [now()->startOfDay(), now()->endOfDay()])
            ->where('status', '!=', 'cancelled')
            ->orderBy('start_time')->get();

        return Inertia::render('Today', [
            'date' => now()->toDateString(),
            'appointments' => $appointments->map(fn (Appointment $a) => [
                'id' => $a->id,
                'patient_id' => $a->patient_id,
                'patient_name' => $a->patient ? trim($a->patient->first_name.' '.$a->patient->last_name) : '',
                'start_time' => $a->start_time->toIso8601String(),
                'end_time' => $a->end_time->toIso8601String(),
                'status' => $a->status,
                'service_type' => $a->service_type,
            ])->values(),
            'growthReady' => $this->growth->dormant()->count() + $this->growth->reviews()->count(),
        ]);
    }
}
