<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;

class JobRequestScheduleStatusController extends Controller
{
    public function update(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $viewer = $request->user();

        $jobRequest->loadMissing(['customer', 'provider.providerProfile', 'schedule']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->schedule, 404);

        $validated = $request->validate([
            'action' => ['required', 'string', Rule::in(['confirm', 'cancel', 'complete'])],
        ]);

        $isAllowed = match ($validated['action']) {
            'confirm' => $jobRequest->canRespondToSchedule($viewer),
            'cancel' => $jobRequest->canCancelSchedule($viewer),
            'complete' => $jobRequest->canCompleteSchedule($viewer),
        };

        abort_unless($isAllowed, 403);

        $nextStatus = match ($validated['action']) {
            'confirm' => 'confirmed',
            'cancel' => 'cancelled',
            'complete' => 'completed',
        };

        $jobRequest->schedule->update([
            'status' => $nextStatus,
            'confirmed_at' => $nextStatus === 'confirmed'
                ? now()
                : $jobRequest->schedule->confirmed_at,
            'cancelled_at' => $nextStatus === 'cancelled'
                ? now()
                : $jobRequest->schedule->cancelled_at,
            'completed_at' => $nextStatus === 'completed'
                ? now()
                : $jobRequest->schedule->completed_at,
        ]);

        $recipient = $viewer->id === $jobRequest->customer_id
            ? $jobRequest->provider
            : $jobRequest->customer;

        if ($recipient) {
            [$type, $title, $body, $label] = match ($nextStatus) {
                'confirmed' => [
                    'request_schedule_confirmed',
                    'Visit confirmed',
                    "{$jobRequest->customer->name} confirmed the scheduled visit for {$jobRequest->title}.",
                    'Open request',
                ],
                'cancelled' => [
                    'request_schedule_cancelled',
                    'Visit cancelled',
                    "{$viewer->name} cancelled the scheduled visit for {$jobRequest->title}.",
                    'Review request',
                ],
                'completed' => [
                    'request_schedule_completed',
                    'Visit marked complete',
                    ($jobRequest->provider?->providerProfile?->business_name ?? $jobRequest->provider?->name ?? 'The provider')
                    ." marked the scheduled visit for {$jobRequest->title} as complete.",
                    'Open request',
                ],
            };

            InAppNotification::notifyUser(
                $recipient,
                $type,
                $title,
                $body,
                route('requests.show', $jobRequest),
                $label,
                [
                    'job_request_id' => $jobRequest->id,
                    'schedule_id' => $jobRequest->schedule->id,
                ],
            );
        }

        return Redirect::route('requests.show', $jobRequest);
    }
}
