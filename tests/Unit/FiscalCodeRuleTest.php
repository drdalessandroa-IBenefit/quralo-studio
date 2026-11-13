<?php

use App\Rules\FiscalCode;
use App\Rules\VatNumber;
use Illuminate\Support\Facades\Validator;

function validate(string $value, object $rule): bool
{
    return Validator::make(['v' => $value], ['v' => [$rule]])->passes();
}

it('accepts a valid fiscal code and one with omocodia', function () {
    expect(validate('RSSMRA85T10A562S', new FiscalCode))->toBeTrue();
    expect(validate('RSSMRA85T10A56NS', new FiscalCode))->toBeTrue();
});

it('rejects a malformed fiscal code', function () {
    expect(validate('ABC', new FiscalCode))->toBeFalse();
});

it('accepts only 11-digit VAT numbers', function () {
    expect(validate('12345678901', new VatNumber))->toBeTrue();
    expect(validate('1234567890', new VatNumber))->toBeFalse();
    expect(validate('1234567890A', new VatNumber))->toBeFalse();
});
