<?php

namespace App\Http\Controllers;

use App\Exceptions\SignatureAlreadyRecorded;
use App\Models\Patient;
use App\Services\SignatureService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SignatureController extends Controller
{
    use AuthorizesRequests;

    public function store(Request $request, Patient $patient, SignatureService $service): RedirectResponse
    {
        $this->authorize('sign', $patient);

        $data = $request->validate([
            'image' => ['required', 'file', 'mimetypes:image/png', 'max:1024'],
            'consent_marketing' => ['sometimes', 'boolean'],
        ]);

        // Signatures are immutable proof: a signed patient cannot be re-signed.
        abort_if($patient->signature_path !== null, 409, 'Signature already recorded.');

        try {
            $service->store($patient, $request->file('image'), (bool) ($data['consent_marketing'] ?? false));
        } catch (SignatureAlreadyRecorded) {
            abort(409, 'Signature already recorded.');
        }

        return redirect()->route('patients.show', $patient);
    }

    public function show(Patient $patient): StreamedResponse
    {
        $this->authorize('view', $patient);
        abort_if($patient->signature_path === null, 404);

        $disk = Storage::disk(SignatureService::DISK);
        abort_unless($disk->exists($patient->signature_path), 404);

        return $disk->response($patient->signature_path, null, [
            'Content-Type' => 'image/png',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
