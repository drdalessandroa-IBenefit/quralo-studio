<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreClinicalNoteRequest;
use App\Models\ClinicalNote;
use App\Models\Patient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Append-only clinical record: index + store only. Corrections are new notes. */
class ClinicalNoteController extends Controller
{
    public function index(Request $request): Response
    {
        $filter = $request->query('patient_id');
        $q = ClinicalNote::query()->with('patient')->latest('created_at');
        if (is_string($filter) && $filter !== '') {
            $q->where('patient_id', $filter);
        }

        return Inertia::render('Clinical', [
            'notes' => $q->get()->map(fn (ClinicalNote $n) => [
                'id' => $n->id,
                'patient_id' => $n->patient_id,
                'patient_name' => $n->patient ? $n->patient->first_name.' '.$n->patient->last_name : '',
                'anamnesis' => $n->anamnesis,
                'treatment_plan' => $n->treatment_plan,
                'session_notes' => $n->session_notes,
                'created_at' => $n->created_at->toIso8601String(),
            ])->all(),
            'patients' => Patient::query()->orderBy('last_name')->orderBy('first_name')->get(['id', 'first_name', 'last_name'])->all(),
            'filter' => is_string($filter) ? $filter : '',
        ]);
    }

    public function store(StoreClinicalNoteRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $patient = Patient::find($data['patient_id']); // auto-scoped: foreign patients are not found
        if (! $patient) {
            return back()->withErrors(['patient_id' => 'Paziente non valido.']);
        }

        $patient->clinicalNotes()->create(collect($data)->except('patient_id')->all());

        return back();
    }
}
