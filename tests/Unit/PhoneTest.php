<?php

use App\Support\Phone;

it('normalizes phone numbers', function (?string $in, ?string $out) {
    expect(Phone::normalize($in))->toBe($out);
})->with([
    'double zero prefix' => ['00393331234567', '393331234567'],
    'plus and spaces' => ['+39 333 123 4567', '393331234567'],
    '10 digits gets 39' => ['3331234567', '393331234567'],
    'already 39' => ['393331234567', '393331234567'],
    'too short' => ['12345', null],
    '10 digits after 39 prefix is 12 ok' => ['0612345678', '390612345678'],
    'empty' => ['', null],
    'null' => [null, null],
    'letters only' => ['abc', null],
    '11 digits not 39 gets 39 (<=11 rule)' => ['44123456789', '3944123456789'],
    '12 digits not 39 stays' => ['441234567890', '441234567890'],
    '9 digits becomes 11' => ['333123456', '39333123456'],
    '8 digits becomes 10 invalid' => ['33312345', null],
]);
