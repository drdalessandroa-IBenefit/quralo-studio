<?php

use App\Support\Ics;
use Illuminate\Support\Carbon;

it('builds a calendar with header and one VEVENT per appointment', function () {
    $ics = Ics::build([
        ['id' => 'a1', 'start_time' => '2030-05-06 10:00:00', 'end_time' => '2030-05-06 11:00:00', 'summary' => 'Mario Rossi · Prima visita'],
        ['id' => 'a2', 'start_time' => '2030-05-06 11:00:00', 'end_time' => '2030-05-06 11:30:00', 'summary' => 'Anna; Bianchi, x'],
    ], Carbon::parse('2030-01-01 00:00:00'));

    expect($ics)->toStartWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//CareConnect//Agenda//EN")
        ->and(substr_count($ics, 'BEGIN:VEVENT'))->toBe(2)
        ->and(substr_count($ics, 'END:VEVENT'))->toBe(2)
        ->and($ics)->toContain('DTSTART:20300506T100000Z')
        ->and($ics)->toContain('DTEND:20300506T110000Z')
        ->and($ics)->toContain('DTSTAMP:20300101T000000Z')
        ->and($ics)->toContain('SUMMARY:Anna\; Bianchi\\, x')
        ->and($ics)->toEndWith("END:VCALENDAR\r\n");
});

it('has no VEVENT when empty and folds long lines at 75 octets', function () {
    expect(Ics::build([]))->not->toContain('VEVENT');
    $ics = Ics::build([['id' => 'x', 'start_time' => '2030-05-06 10:00', 'end_time' => '2030-05-06 11:00', 'summary' => str_repeat('è', 100)]]);
    foreach (explode("\r\n", $ics) as $line) {
        expect(strlen($line))->toBeLessThanOrEqual(75);
    }
});
