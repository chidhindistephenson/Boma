<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Services\PaymentEscrowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use RuntimeException;

class JobRequestPaymentRefundController extends Controller
{
    public function __invoke(
        Request $request,
        JobRequest $jobRequest,
        PaymentEscrowService $escrow,
    ): RedirectResponse {
        $viewer = $request->user();

        $jobRequest->loadMissing(['customer', 'provider.providerProfile', 'payment']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->canRefundPayment($viewer), 403);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:8', 'max:1200'],
        ]);

        try {
            $payment = $escrow->refund($jobRequest->payment, $viewer, $validated['reason']);
        } catch (RuntimeException $exception) {
            return Redirect::route('requests.show', $jobRequest)
                ->withErrors(['refund' => $exception->getMessage()]);
        }

        $providerName = $jobRequest->provider?->providerProfile?->business_name
            ?? $jobRequest->provider?->name
            ?? 'the provider';

        foreach ([$jobRequest->customer, $jobRequest->provider] as $recipient) {
            if (! $recipient) {
                continue;
            }

            InAppNotification::notifyUser(
                $recipient,
                'request_payment_refunded',
                'Payment refunded',
                "The held payment for {$jobRequest->title} was returned to {$jobRequest->customer->name}'s wallet. Provider: {$providerName}.",
                route('requests.show', $jobRequest),
                'View refund',
                [
                    'job_request_id' => $jobRequest->id,
                    'payment_id' => $payment->id,
                    'refunded_by_user_id' => $viewer->id,
                ],
            );
        }

        return Redirect::route('requests.show', $jobRequest);
    }
}
