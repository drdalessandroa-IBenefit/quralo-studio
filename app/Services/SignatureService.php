<?php

namespace App\Services;

use App\Models\Patient;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class SignatureService
{
    public const DISK = 'local';

    public const CONSENT_TEXT_VERSION = 'v1.0-2026-11';

    public function store(Patient $patient, UploadedFile $image, bool $marketing): Patient
    {
        $disk = Storage::disk(self::DISK);
        $path = sprintf('signatures/%s/%s_%d.png', $patient->therapist_id, $patient->id, (int) (microtime(true) * 1000));

        // Immutable proof: never overwrite an existing object.
        if ($disk->exists($path)) {
            throw new RuntimeException('Signature path already exists.');
        }
        $disk->put($path, $image->get());

        $now = now();
        $patient->forceFill([
            'consent_privacy' => true,
            'consent_date' => $now,
            'consent_text_version' => self::CONSENT_TEXT_VERSION,
            'signature_path' => $path,
            'consent_marketing' => $marketing,
            'consent_marketing_date' => $marketing ? $now : null,
        ])->save();

        return $patient;
    }
}
