<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $isProvider = $this->user()?->isProvider() ?? false;

        return [
            'section' => ['nullable', Rule::in(['profile', 'preferences'])],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'city' => ['required', 'string', 'max:120'],
            'area' => ['nullable', 'string', 'max:120'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            'preferred_radius_km' => ['nullable', 'integer', 'min:1', 'max:250'],
            'default_trade_category' => [
                'nullable',
                Rule::in(config('localserve.trade_categories')),
            ],
            'default_urgency' => [
                'nullable',
                Rule::in(array_keys(config('localserve.request.urgency_options'))),
            ],
            'default_budget_min' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'default_budget_max' => ['nullable', 'integer', 'min:0', 'max:100000000', 'gte:default_budget_min'],
            'location_notes' => ['nullable', 'string', 'max:1200'],
            'business_name' => [
                Rule::requiredIf($isProvider),
                'nullable',
                'string',
                'max:255',
            ],
            'headline' => ['nullable', 'string', 'max:160'],
            'trade_category' => [
                Rule::requiredIf($isProvider),
                'nullable',
                Rule::in(config('localserve.trade_categories')),
            ],
            'bio' => [
                Rule::requiredIf($isProvider),
                'nullable',
                'string',
                'max:1000',
            ],
            'availability_status' => [
                Rule::requiredIf($isProvider),
                'nullable',
                Rule::in(config('localserve.provider.availability_options')),
            ],
            'years_experience' => ['nullable', 'integer', 'min:0', 'max:80'],
            'base_price_from' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'response_time_label' => [
                'nullable',
                Rule::in(config('localserve.provider.response_time_options')),
            ],
            'service_radius_km' => ['nullable', 'integer', 'min:1', 'max:250'],
            'verification_notes' => ['nullable', 'string', 'max:1500'],
        ];
    }
}
