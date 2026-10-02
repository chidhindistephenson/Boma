<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Services\PaymentEscrowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class JobRequestPaymentReleaseController extends Controller
{
    public function __invoke(
        Request $request,
        JobRequest $jobRequest,
        PaymentEscrowService $escrow,
    ): RedirectResponse {
        $viewer = $request->user();

        $jobRequest->loadMissing(['customer', 'provider.providerProfile', 'payment']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->canReleasePayment($viewer), 403);

        $releaseReason = $viewer->isAdmin() && $jobRequest->payment->escrow_status === 'disputed'
            ? 'admin_resolved_dispute'
            : 'customer_confirmed';
        $payment = $escrow->release($jobRequest->payment, $viewer, $releaseReason);
        $businessName = $jobRequest->provider?->providerProfile?->business_name
            ?? $jobRequest->provider?->name
            ?? 'The provider';
        $actorLabel = $viewer->isAdmin()
            ? 'Boma support'
            : $jobRequest->customer->name;

        InAppNotification::notifyUser(
            $jobRequest->provider,
            'request_payment_released',
            'Payment released',
            "{$actorLabel} released the held payment for {$jobRequest->title} to {$businessName}.",
            route('requests.show', $jobRequest),
            'View payment',
            [
                'job_request_id' => $jobRequest->id,
                'payment_id' => $payment->id,
            ],
        );

        return Redirect::route('requests.show', $jobRequest);
    }
}
