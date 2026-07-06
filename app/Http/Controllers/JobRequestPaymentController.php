<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class JobRequestPaymentController extends Controller
{
    public function upsert(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $viewer = $request->user();

        $jobRequest->loadMissing(['customer', 'provider.providerProfile', 'payment', 'quote']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->canManagePayment($viewer), 403);

        $validated = $request->validate([
            'amount' => ['required', 'integer', 'min:1', 'max:100000000'],
            'method' => ['required', 'string', Rule::in(array_keys(config('localserve.payment.method_options')))],
            'reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:1200'],
            'paid_at' => ['required', 'date', 'before_or_equal:now'],
        ]);

        $isUpdate = $jobRequest->payment !== null;

        $payment = $jobRequest->payment()->updateOrCreate(
            [],
            [
                'customer_id' => $jobRequest->customer_id,
                'provider_id' => $jobRequest->provider_id,
                'amount' => $validated['amount'],
                'method' => $validated['method'],
                'reference' => ($validated['reference'] ?? null) ?: null,
                'notes' => ($validated['notes'] ?? null) ?: null,
                'status' => 'submitted',
                'paid_at' => $validated['paid_at'],
                'confirmed_at' => null,
                'revision_requested_at' => null,
            ],
        );

        InAppNotification::notifyUser(
            $jobRequest->provider,
            $isUpdate ? 'request_payment_updated' : 'request_payment_recorded',
            $isUpdate ? 'Payment updated' : 'Payment recorded',
            "{$jobRequest->customer->name} ".($isUpdate ? 'updated' : 'recorded')
            ." a payment for {$jobRequest->title}.",
            route('requests.show', $jobRequest),
            'Review payment',
            [
                'job_request_id' => $jobRequest->id,
                'payment_id' => $payment->id,
            ],
        );

        return Redirect::route('requests.show', $jobRequest);
    }
}
