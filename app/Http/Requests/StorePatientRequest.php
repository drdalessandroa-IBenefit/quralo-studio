<?php

namespace App\Http\Requests;

use App\Rules\FiscalCode;
use Illuminate\Foundation\Http\FormRequest;

class StorePatientRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', \App\Models\Patient::class);
    }

    protected function prepareForValidation(): void
    {
        $cf = $this->input('fiscal_code');
        $ref = $this->input('referred_by_code');
        $tags = $this->input('tags');

        if (is_string($tags)) {
            $tags = array_values(array_unique(array_filter(
                array_map(fn ($t) => mb_strtolower(trim($t)), explode(',', $tags)),
                fn ($t) => $t !== '',
            )));
        } elseif (! is_array($tags)) {
            $tags = [];
        }

        $this->merge([
            'fiscal_code' => is_string($cf) ? (strtoupper(trim($cf)) ?: null) : $cf,
            'referred_by_code' => is_string($ref) ? (strtoupper(trim($ref)) ?: null) : $ref,
            'tags' => $tags,
        ]);
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'fiscal_code' => ['nullable', new FiscalCode],
            'tags' => ['array', 'max:50'],
            'tags.*' => ['string', 'max:50'],
            'referred_by_code' => ['nullable', 'string', 'max:32'],
        ];
    }
}
