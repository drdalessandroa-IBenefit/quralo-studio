<?php

namespace App\Http\Controllers;

use App\Exceptions\AppointmentOverlapException;
use App\Http\Requests\StoreAppointmentRequest;
use App\Models\Appointment;
use App\Models\Patient;
use App\Services\AppointmentService;
use App\Support\Ics;
use App\Support\Services;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    use AuthorizesRequests;

    public function __construct(private AppointmentService $appointments) {}

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Appointment::class);
        $history = $request->boolean('history');

        return Inertia::render('Agenda', [
            'appointments' => $this->listQuery($history)->get()->map(fn (Appointment $a) => $this->present($a))->all(),
            'patients' => Patient::query()->orderBy('last_name')->orderBy('first_name')->get(['id', 'first_name', 'last_name'])->all(),
            'services' => Services::list(),
            'history' => $history,
        ]);
    }

    public function store(StoreAppointmentRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $patient = Patient::find($data['patient_id']); // auto-scoped: foreign patients are not found
        if (! $patient) {
            return back()->withErrors(['patient_id' => 'Paziente non valido.']);
        }

        $start = Carbon::parse($data['start_time']);
        $minutes = Services::minutes($data['service_type'], isset($data['minutes']) ? (int) $data['minutes'] : null);
        $end = $start->copy()->addMinutes($minutes);

        try {
            $this->appointments->book($patient, $start, $end, $data['service_type'], $data['notes'] ?? null);
        } catch (AppointmentOverlapException $e) {
            return back()->withErrors(['start_time' => $e->getMessage()]);
        }

        return back();
    }

    public function status(Request $request, Appointment $appointment): RedirectResponse
    {
        $this->authorize('update', $appointment);
        $data = $request->validate(['status' => ['required', Rule::in(['completed', 'no_show', 'cancelled'])]]);

        // Only scheduled appointments transition: re-activating a cancelled slot would bypass the overlap check.
        if ($appointment->status !== 'scheduled') {
            return back()->withErrors(['status' => 'Lo stato non è modificabile.']);
        }
        $appointment->update(['status' => $data['status']]);

        return back();
    }

    public function export(Request $request): HttpResponse
    {
        $this->authorize('viewAny', Appointment::class);
        $items = $this->listQuery($request->boolean('history'))->where('status', '<>', 'cancelled')->get();

        return $this->ics($items->all(), 'careconnect-agenda.ics');
    }

    public function exportOne(Appointment $appointment): HttpResponse
    {
        $this->authorize('view', $appointment);

        return $this->ics([$appointment->load('patient')], 'careconnect-'.$appointment->id.'.ics');
    }

    private function listQuery(bool $history)
    {
        $q = Appointment::query()->with('patient')->orderBy('start_time');
        if (! $history) {
            $q->where('end_time', '>=', Carbon::today());
        }

        return $q;
    }

    /** @param Appointment[] $items */
    private function ics(array $items, string $filename): HttpResponse
    {
        $events = array_map(fn (Appointment $a) => [
            'id' => $a->id,
            'start_time' => $a->start_time,
            'end_time' => $a->end_time,
            'summary' => trim(($a->patient?->first_name.' '.$a->patient?->last_name)).' · '.
                (Services::ALL[$a->service_type]['label'] ?? 'Durata personalizzata'),
        ], $items);

        return response(Ics::build($events), 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    private function present(Appointment $a): array
    {
        return [
            'id' => $a->id,
            'patient_id' => $a->patient_id,
            'patient_name' => $a->patient ? $a->patient->first_name.' '.$a->patient->last_name : '',
            'start_time' => $a->start_time->toIso8601String(),
            'end_time' => $a->end_time->toIso8601String(),
            'minutes' => (int) $a->start_time->diffInMinutes($a->end_time),
            'status' => $a->status,
            'service_type' => $a->service_type,
            'notes' => $a->notes,
        ];
    }
}
