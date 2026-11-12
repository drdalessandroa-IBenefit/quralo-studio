<?php

namespace App\Http\Requests;

use App\Models\PresaleLead;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePresaleLeadRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'profession' => ['required', Rule::in(PresaleLead::PROFESSIONS)],
            'consent_privacy' => ['accepted'],
            // Honeypot: bots fill it; handled (silently dropped) by the controller, never a validation error.
            'website' => ['nullable', 'string'],
        ];
    }

    public function isBot(): bool
    {
        return filled($this->input('website'));
    }
}
