<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Services\Payments\PesepayGateway;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Symfony\Component\HttpFoundation\Response;

class PesepayPaymentController extends Controller
{
    public function result(Request $request, JobRequest $jobRequest, PesepayGateway $gateway): Response
    {
        $jobRequest->loadMissing(['payment', 'customer', 'provider.providerProfile']);

        abort_unless($jobRequest->payment?->gateway_provider === 'Pesepay', 404);

        $wasConfirmed = $jobRequest->payment->status === 'confirmed';
        $gateway->sync($jobRequest->payment, $request->all());
        $jobRequest->payment->refresh();

        if (! $wasConfirmed && $jobRequest->payment->status === 'confirmed') {
            $this->notifyPaymentConfirmed($jobRequest);
        }

        return response()->noContent();
    }

    public function return(Request $request, JobRequest $jobRequest, PesepayGateway $gateway): RedirectResponse
    {
        $viewer = $request->user();

        abort_unless($jobRequest->isVisibleTo($viewer), 403);

        $jobRequest->loadMissing(['payment', 'customer', 'provider.providerProfile']);

        if ($jobRequest->payment?->gateway_provider === 'Pesepay') {
            $wasConfirmed = $jobRequest->payment->status === 'confirmed';
            $gateway->sync($jobRequest->payment, $request->all());
            $jobRequest->payment->refresh();

            if (! $wasConfirmed && $jobRequest->payment->status === 'confirmed') {
                $this->notifyPaymentConfirmed($jobRequest);
            }
        }

        return Redirect::route('requests.show', $jobRequest);
    }

    public function sync(Request $request, JobRequest $jobRequest, PesepayGateway $gateway): RedirectResponse
    {
        $viewer = $request->user();

        abort_unless($jobRequest->isVisibleTo($viewer), 403);

        $jobRequest->loadMissing(['payment', 'customer', 'provider.providerProfile']);
        abort_unless($jobRequest->payment?->gateway_provider === 'Pesepay', 404);

        $wasConfirmed = $jobRequest->payment->status === 'confirmed';
        $gateway->sync($jobRequest->payment);
        $jobRequest->payment->refresh();

        if (! $wasConfirmed && $jobRequest->payment->status === 'confirmed') {
            $this->notifyPaymentConfirmed($jobRequest);
        }

        return Redirect::route('requests.show', $jobRequest);
    }

    private function notifyPaymentConfirmed(JobRequest $jobRequest): void
    {
        InAppNotification::notifyUser(
            $jobRequest->provider,
            'request_payment_confirmed',
            'Payment received',
            "{$jobRequest->customer->name} paid {$jobRequest->title} through Pesepay. Transaction {$jobRequest->payment->reference} is confirmed.",
            route('requests.show', $jobRequest),
            'View payment',
            [
                'job_request_id' => $jobRequest->id,
                'payment_id' => $jobRequest->payment->id,
            ],
        );
    }
}
