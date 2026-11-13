<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateStudioRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StudioController extends Controller
{
    public function edit(Request $request): Response
    {
        $p = $request->user()->profile;

        return Inertia::render('Studio', [
            'profile' => [
                'full_name' => $p?->full_name ?? '',
                'studio_name' => $p?->studio_name ?? '',
                'fiscal_code' => $p?->fiscal_code ?? '',
                'vat_number' => $p?->vat_number ?? '',
                'google_review_url' => $p?->google_review_url ?? '',
            ],
        ]);
    }

    public function update(UpdateStudioRequest $request): RedirectResponse
    {
        $request->user()->profile()->updateOrCreate([], $request->validated());

        return back();
    }
}
