<?php

namespace App\Support;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

final class Ics
{
    /** @param iterable<array{id:string,start_time:mixed,end_time:mixed,summary:string}> $events */
    public static function build(iterable $events, ?CarbonInterface $now = null): string
    {
        $stamp = fn ($d) => Carbon::parse($d)->utc()->format('Ymd\THis\Z');
        $now ??= Carbon::now();
        $lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CareConnect//Agenda//EN', 'CALSCALE:GREGORIAN'];
        foreach ($events as $e) {
            array_push(
                $lines,
                'BEGIN:VEVENT',
                'UID:'.self::escape($e['id']).'@careconnect',
                'DTSTAMP:'.$stamp($now),
                'DTSTART:'.$stamp($e['start_time']),
                'DTEND:'.$stamp($e['end_time']),
                'SUMMARY:'.self::escape($e['summary']),
                'END:VEVENT',
            );
        }
        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", array_map([self::class, 'fold'], $lines))."\r\n";
    }

    private static function escape(string $s): string
    {
        return str_replace(['\\', "\r\n", "\r", "\n", ';', ','], ['\\\\', '\\n', '\\n', '\\n', '\;', '\\,'], $s);
    }

    /** Fold at 75 octets without splitting UTF-8 characters. */
    private static function fold(string $line): string
    {
        $out = '';
        $chunk = '';
        $bytes = 0;
        foreach (mb_str_split($line) as $c) {
            $n = strlen($c);
            if ($bytes + $n > 75) {
                $out .= $chunk."\r\n";
                $chunk = ' ';
                $bytes = 1;
            }
            $chunk .= $c;
            $bytes += $n;
        }

        return $out.$chunk;
    }
}
