<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClinicalNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $clean = [];
        foreach (['anamnesis', 'treatment_plan', 'session_notes'] as $k) {
            $v = $this->input($k);
            $clean[$k] = is_string($v) && trim($v) !== '' ? trim($v) : null;
        }
        $this->merge($clean);
    }

    public function rules(): array
    {
        return [
            'patient_id' => ['required', 'uuid'],
            'anamnesis' => ['required_without_all:treatment_plan,session_notes', 'nullable', 'string', 'max:10000'],
            'treatment_plan' => ['nullable', 'string', 'max:10000'],
            'session_notes' => ['nullable', 'string', 'max:10000'],
        ];
    }
}
