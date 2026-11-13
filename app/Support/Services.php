<?php

namespace App\Support;

/** Bookable services and their fixed durations (minutes). Extend by adding entries. */
final class Services
{
    public const CUSTOM = 'custom';

    public const ALL = [
        'prima_visita' => ['label' => 'Prima visita', 'minutes' => 60],
        'controllo' => ['label' => 'Trattamento di controllo', 'minutes' => 30],
        'avanzato' => ['label' => 'Trattamento avanzato', 'minutes' => 45],
    ];

    public const CUSTOM_MIN = 10;

    public const CUSTOM_MAX = 240;

    public const CUSTOM_STEP = 5;

    /** @return list<string> service ids including custom */
    public static function ids(): array
    {
        return [...array_keys(self::ALL), self::CUSTOM];
    }

    /** Duration in minutes for a service; custom requires $custom. */
    public static function minutes(string $id, ?int $custom = null): ?int
    {
        return $id === self::CUSTOM ? $custom : (self::ALL[$id]['minutes'] ?? null);
    }

    public static function list(): array
    {
        return collect(self::ALL)->map(fn ($s, $id) => ['id' => $id] + $s)->values()->all();
    }
}
