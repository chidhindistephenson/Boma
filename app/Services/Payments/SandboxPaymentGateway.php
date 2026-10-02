<?php

namespace App\Services\Payments;

use App\Models\JobRequest;
use Illuminate\Support\Str;

class SandboxPaymentGateway
{
    public function charge(JobRequest $jobRequest, array $payload): array
    {
        $prefix = match ($payload['method']) {
            'mobile_money' => 'MOB',
            'bank_transfer' => 'BNK',
            'card', 'saved_card' => 'CRD',
            default => 'BOM',
        };

        return [
            'provider' => config('localserve.payment.gateway_provider'),
            'status' => 'paid',
            'transaction_id' => $prefix.'-'.$jobRequest->id.'-'.Str::upper(Str::random(10)),
            'authorization_code' => 'AUTH-'.Str::upper(Str::random(8)),
            'processed_at' => now(),
        ];
    }
}
