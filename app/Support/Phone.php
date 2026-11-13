<?php

namespace App\Support;

class Phone
{
    /** Digits only, strip leading 00, prepend 39 if not 39-prefixed and <=11 digits; null if <11 digits. */
    public static function normalize(?string $raw): ?string
    {
        $d = preg_replace('/\D+/', '', (string) $raw);
        if (str_starts_with($d, '00')) {
            $d = substr($d, 2);
        }
        if (! str_starts_with($d, '39') && strlen($d) <= 11) {
            $d = '39'.$d;
        }

        return strlen($d) >= 11 ? $d : null;
    }
}
