<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreJobRequestMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('body'))) {
            $this->merge(['body' => trim($this->input('body')) ?: null]);
        }
    }

    public function rules(): array
    {
        return [
            'body' => ['nullable', 'required_without:media', 'string', 'max:2000'],
            'media' => [
                'nullable',
                'required_without:body',
                'file',
                'mimes:jpg,jpeg,png,webp,gif,pdf',
                'max:10240',
            ],
        ];
    }
}
