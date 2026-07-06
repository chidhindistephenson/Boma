<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class JobRequestMessageController extends Controller
{
    public function store(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $jobRequest->load(['customer', 'provider']);

        $viewer = $request->user();

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->canMessage($viewer), 403);

        $validated = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $jobRequest->messages()->create([
            'sender_id' => $viewer->id,
            'body' => $validated['body'],
        ]);

        if ($jobRequest->status === 'targeted' && $viewer->id === $jobRequest->provider_id) {
            $jobRequest->update(['status' => 'in_conversation']);
        }

        $jobRequest->markAsReadFor($viewer);

        $recipient = $viewer->id === $jobRequest->customer_id
            ? $jobRequest->provider
            : $jobRequest->customer;

        if ($recipient) {
            InAppNotification::notifyUser(
                $recipient,
                'request_message',
                'New message on a request',
                "{$viewer->name} sent a new message on {$jobRequest->title}.",
                route('requests.show', $jobRequest),
                'Open thread',
                [
                    'job_request_id' => $jobRequest->id,
                    'sender_id' => $viewer->id,
                ],
            );
        }

        return Redirect::route('requests.show', $jobRequest);
    }
}
