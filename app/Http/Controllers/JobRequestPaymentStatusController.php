<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Services\PaymentEscrowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class JobRequestPaymentStatusController extends Controller
{
    public function update(
        Request $request,
        JobRequest $jobRequest,
        PaymentEscrowService $escrow,
    ): RedirectResponse
    {
        $viewer = $request->user();

        $jobRequest->loadMissing(['customer', 'provider.providerProfile', 'payment', 'quote']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->payment, 404);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['confirm', 'request_revision'])],
            'review_notes' => [
                Rule::requiredIf($request->string('action')->toString() === 'request_revision'),
                'nullable',
                'string',
                'max:1200',
            ],
        ]);

        abort_unless($jobRequest->canRespondToPayment($viewer), 403);

        $nextStatus = $validated['action'] === 'confirm'
            ? 'confirmed'
            : 'revision_requested';

        $jobRequest->payment->update([
            'status' => $nextStatus,
            'confirmed_at' => $nextStatus === 'confirmed'
                ? now()
                : $jobRequest->payment->confirmed_at,
            'revision_requested_at' => $nextStatus === 'revision_requested'
                ? now()
                : $jobRequest->payment->revision_requested_at,
            'reviewed_by_user_id' => $viewer->id,
            'review_notes' => ($validated['review_notes'] ?? null) ?: null,
        ]);

        if ($nextStatus === 'confirmed') {
            $escrow->markExternal($jobRequest->payment);
        }

        [$type, $title, $body, $label] = $nextStatus === 'confirmed'
            ? [
                'request_payment_confirmed',
                'Payment confirmed',
                ($jobRequest->provider?->providerProfile?->business_name ?? $jobRequest->provider?->name ?? 'The provider')
                ." confirmed your payment for {$jobRequest->title}.",
                'Open request',
            ]
            : [
                'request_payment_revision_requested',
                'Payment needs review',
                ($jobRequest->provider?->providerProfile?->business_name ?? $jobRequest->provider?->name ?? 'The provider')
                ." asked you to review the payment record for {$jobRequest->title}."
                .(($validated['review_notes'] ?? null) ? " Reason: {$validated['review_notes']}" : ''),
                'Review payment',
            ];

        InAppNotification::notifyUser(
            $jobRequest->customer,
            $type,
            $title,
            $body,
            route('requests.show', $jobRequest),
            $label,
            [
                'job_request_id' => $jobRequest->id,
                'payment_id' => $jobRequest->payment->id,
            ],
        );

        return Redirect::route('requests.show', $jobRequest);
    }
}
