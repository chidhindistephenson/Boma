<?php

use App\Models\JobRequestPayment;
use App\Services\PaymentEscrowService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('payments:release-due', function () {
    $escrow = app(PaymentEscrowService::class);
    $released = 0;

    JobRequestPayment::query()
        ->with(['jobRequest.customer', 'jobRequest.provider.providerProfile'])
        ->where('status', 'confirmed')
        ->where('escrow_status', 'held')
        ->whereNotNull('release_due_at')
        ->where('release_due_at', '<=', now())
        ->chunkById(100, function ($payments) use ($escrow, &$released) {
            foreach ($payments as $payment) {
                $escrow->release($payment, null, 'auto_48h');
                $released++;
            }
        });

    $this->info("Released {$released} escrow payment(s).");
})->purpose('Release confirmed escrow payments once their 48-hour hold has expired');

Schedule::command('payments:release-due')->hourly();
