<?php

namespace App\Http\Controllers;

use App\Models\MarketingEvent;
use App\Models\Patient;
use App\Services\GrowthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class GrowthController extends Controller
{
    public function __construct(private GrowthService $growth) {}

    public function index(Request $request): Response
    {
        $profile = $request->user()->profile;
        $tag = $request->query('tag');
        $row = fn (Patient $p) => [
            'id' => $p->id,
            'first_name' => $p->first_name,
            'name' => trim($p->first_name.' '.$p->last_name),
            'phone' => $p->phone_normalized,
            'tags' => $p->tags ?? [],
        ];

        return Inertia::render('Growth', [
            'studio' => $profile?->studio_name ?: ($profile?->full_name ?: ''),
            'googleReviewUrl' => $profile?->google_review_url ?: null,
            'dormant' => $this->growth->dormant()->map(fn (Patient $p) => $row($p) + [
                'days' => $p->last_visit ? (int) abs(Carbon::parse($p->last_visit)->diffInDays(now())) : null,
            ])->values(),
            'dormantExcludedNoConsent' => $this->growth->dormantExcludedNoConsent(),
            'reviews' => $this->growth->reviews()->map($row)->values(),
            'tags' => $this->growth->tags(),
            'tag' => $tag,
            'campaign' => is_string($tag) && $tag !== '' ? $this->growth->campaign($tag)->map($row)->values() : [],
            'referrals' => $this->growth->referrals()->values(),
            'patients' => Patient::orderBy('last_name')->get(['id', 'first_name', 'last_name'])
                ->map(fn ($p) => ['id' => $p->id, 'name' => trim($p->first_name.' '.$p->last_name)])->values(),
        ]);
    }

    public function logEvent(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'patient_id' => ['required', 'uuid'],
            'type' => ['required', Rule::in(MarketingEvent::TYPES)],
        ]);
        $patient = Patient::findOrFail($data['patient_id']);
        abort_unless($this->growth->isReachable($patient), 422, 'Patient not reachable for marketing.');
        $this->growth->logEvent($patient, $data['type']);

        return back();
    }

    public function generateCode(Request $request): RedirectResponse
    {
        $data = $request->validate(['patient_id' => ['required', 'uuid']]);
        $this->growth->referralCodeFor(Patient::findOrFail($data['patient_id']));

        return back();
    }
}
