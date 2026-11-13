<?php

namespace App\Http\Requests;

use App\Support\Services;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreAppointmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'patient_id' => ['required', 'uuid'],
            'service_type' => ['required', Rule::in(Services::ids())],
            'start_time' => ['required', 'date'],
            'minutes' => [
                Rule::requiredIf(fn () => $this->input('service_type') === Services::CUSTOM),
                'nullable', 'integer', 'min:'.Services::CUSTOM_MIN, 'max:'.Services::CUSTOM_MAX,
                'multiple_of:'.Services::CUSTOM_STEP,
            ],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
