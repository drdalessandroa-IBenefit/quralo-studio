<?php

namespace App\Http\Requests;

use App\Rules\FiscalCode;
use App\Rules\VatNumber;
use Illuminate\Foundation\Http\FormRequest;

class UpdateStudioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'fiscal_code' => is_string($this->fiscal_code) ? strtoupper(trim($this->fiscal_code)) : $this->fiscal_code,
        ]);
    }

    public function rules(): array
    {
        return [
            'full_name' => ['nullable', 'string', 'max:255'],
            'studio_name' => ['nullable', 'string', 'max:255'],
            'fiscal_code' => ['nullable', new FiscalCode],
            'vat_number' => ['nullable', new VatNumber],
            'google_review_url' => ['nullable', 'string', 'max:2048', 'starts_with:https://'],
        ];
    }
}
