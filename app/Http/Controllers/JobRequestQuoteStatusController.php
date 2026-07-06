<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class JobRequestQuoteStatusController extends Controller
{
    public function update(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $viewer = $request->user();

        $jobRequest->loadMissing(['customer', 'provider.providerProfile', 'quote']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->canQuoteBeRespondedToBy($viewer), 403);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['accept', 'decline'])],
        ]);

        $nextStatus = $validated['action'] === 'accept' ? 'accepted' : 'declined';

        $jobRequest->quote->update([
            'status' => $nextStatus,
            'responded_at' => now(),
        ]);

        if ($nextStatus === 'accepted' && in_array($jobRequest->status, ['targeted', 'in_conversation'], true)) {
            $jobRequest->update(['status' => 'accepted']);
        }

        InAppNotification::notifyUser(
            $jobRequest->provider,
            $nextStatus === 'accepted' ? 'request_quote_accepted' : 'request_quote_declined',
            $nextStatus === 'accepted' ? 'Quote accepted' : 'Quote declined',
            "{$jobRequest->customer->name} {$nextStatus} your quote for {$jobRequest->title}.",
            route('requests.show', $jobRequest),
            'Open request',
            [
                'job_request_id' => $jobRequest->id,
                'quote_id' => $jobRequest->quote->id,
            ],
        );

        return Redirect::route('requests.show', $jobRequest);
    }
}
