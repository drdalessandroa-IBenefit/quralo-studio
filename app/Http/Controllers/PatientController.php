<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientRequest;
use App\Models\Patient;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Patient::class);

        $search = trim((string) $request->query('search', ''));
        $query = Patient::query()->orderBy('last_name')->orderBy('first_name');

        if ($search !== '') {
            $like = '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search).'%';
            $query->where(fn ($q) => $q
                ->where('first_name', 'like', $like)
                ->orWhere('last_name', 'like', $like)
                ->orWhere('email', 'like', $like)
                ->orWhere('phone', 'like', $like)
                ->orWhere('fiscal_code', 'like', $like)
                ->orWhere('tags', 'like', $like));
        }

        return Inertia::render('Patients/Index', [
            'patients' => $query->get()->map(fn (Patient $p) => $this->present($p))->all(),
            'search' => $search,
        ]);
    }

    public function store(StorePatientRequest $request): RedirectResponse
    {
        $patient = Patient::create($request->validated());

        return redirect()->route('patients.show', $patient);
    }

    public function show(Patient $patient): Response
    {
        $this->authorize('view', $patient);

        return Inertia::render('Patients/Show', ['patient' => $this->present($patient)]);
    }

    private function present(Patient $p): array
    {
        return [
            'id' => $p->id,
            'first_name' => $p->first_name,
            'last_name' => $p->last_name,
            'email' => $p->email,
            'phone' => $p->phone,
            'fiscal_code' => $p->fiscal_code,
            'tags' => $p->tags ?? [],
            'consent_privacy' => (bool) $p->consent_privacy,
            'privacy_signed' => (bool) $p->consent_privacy && $p->signature_path !== null,
            'consent_marketing' => (bool) $p->consent_marketing,
        ];
    }
}
