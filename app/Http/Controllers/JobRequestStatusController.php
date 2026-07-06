<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class JobRequestStatusController extends Controller
{
    public function update(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $viewer = $request->user();

        $jobRequest->loadMissing(['customer', 'provider.providerProfile']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['accept', 'decline', 'close'])],
        ]);

        $nextStatus = match ($validated['action']) {
            'accept' => $jobRequest->canBeAcceptedBy($viewer) ? 'accepted' : null,
            'decline' => $jobRequest->canBeDeclinedBy($viewer) ? 'declined' : null,
            'close' => $jobRequest->canBeClosedBy($viewer) ? 'closed' : null,
        };

        abort_unless($nextStatus !== null, 403);

        $jobRequest->update([
            'status' => $nextStatus,
        ]);

        if ($nextStatus === 'accepted') {
            InAppNotification::notifyUser(
                $jobRequest->customer,
                'request_accepted',
                'Request accepted',
                ($jobRequest->provider?->providerProfile?->business_name ?? $jobRequest->provider?->name ?? 'A provider')
                ." accepted {$jobRequest->title}.",
                route('requests.show', $jobRequest),
                'Open request',
                ['job_request_id' => $jobRequest->id],
            );
        }

        if ($nextStatus === 'declined') {
            InAppNotification::notifyUser(
                $jobRequest->customer,
                'request_declined',
                'Request declined',
                ($jobRequest->provider?->providerProfile?->business_name ?? $jobRequest->provider?->name ?? 'A provider')
                ." declined {$jobRequest->title}.",
                route('requests.show', $jobRequest),
                'Review request',
                ['job_request_id' => $jobRequest->id],
            );
        }

        if ($nextStatus === 'closed') {
            $recipients = collect([$jobRequest->customer, $jobRequest->provider])
                ->filter()
                ->reject(fn ($user) => $user->id === $viewer->id);

            foreach ($recipients as $recipient) {
                InAppNotification::notifyUser(
                    $recipient,
                    'request_closed',
                    'Request closed',
                    "{$viewer->name} closed {$jobRequest->title}.",
                    route('requests.show', $jobRequest),
                    'View request',
                    ['job_request_id' => $jobRequest->id],
                );
            }
        }

        return Redirect::route('requests.show', $jobRequest);
    }
}
