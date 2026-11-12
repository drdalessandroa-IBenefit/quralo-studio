<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePresaleLeadRequest;
use App\Models\PresaleLead;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class PresaleController extends Controller
{
    public function show(): Response
    {
        return Inertia::render('Prevendita', ['professions' => PresaleLead::PROFESSIONS]);
    }

    public function store(StorePresaleLeadRequest $request): RedirectResponse
    {
        // Honeypot: pretend success, store nothing, leak nothing.
        if (! $request->isBot()) {
            PresaleLead::create($request->safe()->except('website'));
        }

        return redirect()->route('prevendita.show')->with('success', true);
    }
}
