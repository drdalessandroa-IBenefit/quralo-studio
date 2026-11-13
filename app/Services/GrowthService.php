<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\MarketingEvent;
use App\Models\Patient;
use App\Models\ReferralCode;
use App\Support\Phone;
use Illuminate\Support\Collection;

/**
 * Growth engine. Everything is scoped to the authenticated therapist via
 * OwnedByTherapist. Only marketing-consented patients with a valid phone are
 * ever surfaced; messages never contain health data.
 */
class GrowthService
{
    public const DORMANT_DAYS = 90;
    public const DORMANT_COOLDOWN_DAYS = 60;
    public const REVIEW_WINDOW_DAYS = 14;
    public const REVIEW_COOLDOWN_DAYS = 180;
    public const CAMPAIGN_COOLDOWN_DAYS = 14;
    public const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    /** @return Collection<int, Patient> with `phone_normalized` and `last_visit` attributes set */
    public function dormant(): Collection
    {
        return $this->reachable($this->dormantQuery())
            ->each(fn (Patient $p) => $p->setAttribute('last_visit', Appointment::where('patient_id', $p->id)
                ->where('status', '!=', 'cancelled')->max('start_time')));
    }

    /** Dormant patients hidden because they have no marketing consent. */
    public function dormantExcludedNoConsent(): int
    {
        return $this->dormantQuery()->where('consent_marketing', false)->count();
    }

    /** @return Collection<int, Patient> */
    public function reviews(): Collection
    {
        $ids = Appointment::query()->where('status', 'completed')
            ->where('start_time', '>=', now()->subDays(self::REVIEW_WINDOW_DAYS))
            ->where('start_time', '<=', now())->pluck('patient_id')->unique();

        return $this->reachable(Patient::query()->whereIn('id', $ids)
            ->whereNotIn('id', $this->contactedIds('review', self::REVIEW_COOLDOWN_DAYS)));
    }

    /** @return Collection<int, Patient> */
    public function campaign(string $tag): Collection
    {
        $contacted = $this->contactedIds('campaign', self::CAMPAIGN_COOLDOWN_DAYS);

        return $this->reachable(Patient::query()->whereNotIn('id', $contacted))
            ->filter(fn (Patient $p) => in_array($tag, $p->tags ?? [], true))->values();
    }

    /** @return list<string> */
    public function tags(): array
    {
        return Patient::query()->pluck('tags')->flatten()->filter()->unique()->sort()->values()->all();
    }

    public function logEvent(Patient $patient, string $type): MarketingEvent
    {
        return MarketingEvent::create(['patient_id' => $patient->id, 'type' => $type, 'sent_at' => now()]);
    }

    /** One stable code per patient (idempotent). */
    public function referralCodeFor(Patient $patient): ReferralCode
    {
        if ($existing = ReferralCode::where('patient_id', $patient->id)->first()) {
            return $existing;
        }
        do {
            $code = self::generateCode();
        } while (ReferralCode::where('code', $code)->exists());

        return ReferralCode::create(['patient_id' => $patient->id, 'code' => $code]);
    }

    public static function generateCode(): string
    {
        $bytes = random_bytes(5);
        $n = strlen(self::CODE_ALPHABET);
        $out = '';
        for ($i = 0; $i < 5; $i++) {
            $out .= self::CODE_ALPHABET[ord($bytes[$i]) % $n];
        }

        return 'QRL'.$out;
    }

    /** @return Collection<int, array{id:string,code:string,patient_id:string,patient:string,uses:int}> */
    public function referrals(): Collection
    {
        return ReferralCode::with('patient')->get()->map(fn (ReferralCode $r) => [
            'id' => $r->id,
            'code' => $r->code,
            'patient_id' => $r->patient_id,
            'patient' => trim(($r->patient?->first_name ?? '').' '.($r->patient?->last_name ?? '')),
            'uses' => Patient::where('referred_by_code', $r->code)->count(),
        ]);
    }

    public function isReachable(Patient $p): bool
    {
        return $p->consent_marketing && Phone::normalize($p->phone) !== null;
    }

    /** Patients with >=1 non-cancelled appointment and none (past or future) since the cutoff. */
    private function dormantQuery()
    {
        $cutoff = now()->subDays(self::DORMANT_DAYS);
        $hasAny = Appointment::query()->where('status', '!=', 'cancelled')->select('patient_id');
        $recent = Appointment::query()->where('status', '!=', 'cancelled')
            ->where('start_time', '>=', $cutoff)->select('patient_id');

        // Phone validity is not part of this count/base query: consent only.
        return Patient::query()->whereIn('id', $hasAny)->whereNotIn('id', $recent)
            ->whereNotIn('id', $this->contactedIds('dormant', self::DORMANT_COOLDOWN_DAYS));
    }

    private function contactedIds(string $type, int $days)
    {
        return MarketingEvent::query()->where('type', $type)
            ->where('sent_at', '>=', now()->subDays($days))->select('patient_id');
    }

    private function reachable($query): Collection
    {
        return $query->where('consent_marketing', true)->orderBy('last_name')->get()
            ->filter(fn (Patient $p) => $this->attachPhone($p))->values();
    }

    private function attachPhone(Patient $p): bool
    {
        $n = Phone::normalize($p->phone);
        $p->setAttribute('phone_normalized', $n);

        return $n !== null;
    }
}
