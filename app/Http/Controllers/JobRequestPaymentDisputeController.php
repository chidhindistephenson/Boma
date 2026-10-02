<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use App\Models\User;
use App\Services\PaymentEscrowService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use RuntimeException;

class JobRequestPaymentDisputeController extends Controller
{
    public function __invoke(
        Request $request,
        JobRequest $jobRequest,
        PaymentEscrowService $escrow,
    ): RedirectResponse {
        $viewer = $request->user();

        $jobRequest->loadMissing(['customer', 'provider.providerProfile', 'payment']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->canDisputePayment($viewer), 403);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:8', 'max:1200'],
        ]);

        try {
            $payment = $escrow->dispute($jobRequest->payment, $viewer, $validated['reason']);
        } catch (RuntimeException $exception) {
            return Redirect::route('requests.show', $jobRequest)
                ->withErrors(['dispute' => $exception->getMessage()]);
        }

        $counterparty = $viewer->id === $jobRequest->customer_id
            ? $jobRequest->provider
            : $jobRequest->customer;

        if ($counterparty) {
            InAppNotification::notifyUser(
                $counterparty,
                'request_payment_disputed',
                'Payment disputed',
                "{$viewer->name} opened a payment dispute on {$jobRequest->title}. Funds will stay held until an admin resolves it.",
                route('requests.show', $jobRequest),
                'View dispute',
                [
                    'job_request_id' => $jobRequest->id,
                    'payment_id' => $payment->id,
                    'disputed_by_user_id' => $viewer->id,
                ],
            );
        }

        User::query()
            ->where('role', 'admin')
            ->where('status', 'active')
            ->get()
            ->each(fn (User $admin) => InAppNotification::notifyUser(
                $admin,
                'request_payment_disputed',
                'Payment dispute opened',
                "{$viewer->name} disputed the held payment for {$jobRequest->title}.",
                route('requests.show', $jobRequest),
                'Resolve dispute',
                [
                    'job_request_id' => $jobRequest->id,
                    'payment_id' => $payment->id,
                    'disputed_by_user_id' => $viewer->id,
                ],
            ));

        return Redirect::route('requests.show', $jobRequest);
    }
}
