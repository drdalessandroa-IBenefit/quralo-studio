<?php

namespace App\Services;

use App\Exceptions\SignatureAlreadyRecorded;
use App\Models\Patient;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Throwable;

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
            // Same-millisecond collision means a concurrent signer already wrote it: refuse, never overwrite.
            throw new SignatureAlreadyRecorded;
        }
        $disk->put($path, $image->get());

        $now = now();
        try {
            // Atomic compare-and-set: only the first writer wins, even under concurrency.
            $affected = Patient::whereKey($patient->getKey())->whereNull('signature_path')->update([
                'consent_privacy' => true,
                'consent_date' => $now,
                'consent_text_version' => self::CONSENT_TEXT_VERSION,
                'signature_path' => $path,
                'consent_marketing' => $marketing,
                'consent_marketing_date' => $marketing ? $now : null,
                'updated_at' => $now,
            ]);
        } catch (Throwable $e) {
            $disk->delete($path);
            throw $e;
        }

        if ($affected === 0) {
            $disk->delete($path);
            throw new SignatureAlreadyRecorded;
        }

        return $patient->refresh();
    }
}
