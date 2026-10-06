<?php

namespace App\Services;

use App\Models\JobRequestPayment;
use App\Notifications\PaymentReceiptNotification;

class PaymentReceiptService
{
    public function send(JobRequestPayment $payment, string $eventType = 'confirmed'): void
    {
        $payment->loadMissing(['customer', 'provider', 'jobRequest']);

        if (! in_array($payment->status, ['confirmed', 'refunded'], true)) {
            return;
        }

        foreach ([$payment->customer, $payment->provider] as $user) {
            if ($user) {
                $user->notify(new PaymentReceiptNotification($payment, $eventType));
            }
        }
    }
}
