<?php

namespace App\Http\Controllers;

use App\Models\InAppNotification;
use App\Models\JobRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;

class JobRequestScheduleController extends Controller
{
    public function upsert(Request $request, JobRequest $jobRequest): RedirectResponse
    {
        $viewer = $request->user();

        $jobRequest->loadMissing(['customer', 'provider.providerProfile', 'schedule']);

        abort_unless($jobRequest->isVisibleTo($viewer), 403);
        abort_unless($jobRequest->canManageSchedule($viewer), 403);

        $validated = $request->validate([
            'scheduled_for' => ['required', 'date', 'after:now'],
            'duration_hours' => ['required', 'integer', 'min:1', 'max:24'],
            'notes' => ['nullable', 'string', 'max:1200'],
        ]);

        $isUpdate = $jobRequest->schedule !== null;

        $schedule = $jobRequest->schedule()->updateOrCreate(
            [],
            [
                'proposed_by_user_id' => $viewer->id,
                'scheduled_for' => $validated['scheduled_for'],
                'duration_hours' => $validated['duration_hours'],
                'status' => 'proposed',
                'notes' => ($validated['notes'] ?? null) ?: null,
                'confirmed_at' => null,
                'completed_at' => null,
                'cancelled_at' => null,
            ],
        );

        InAppNotification::notifyUser(
            $jobRequest->customer,
            $isUpdate ? 'request_schedule_updated' : 'request_schedule_proposed',
            $isUpdate ? 'Visit updated' : 'Visit proposed',
            ($jobRequest->provider?->providerProfile?->business_name ?? $jobRequest->provider?->name ?? 'A provider')
            .' proposed a visit for '.$jobRequest->title.'.',
            route('requests.show', $jobRequest),
            'Review schedule',
            [
                'job_request_id' => $jobRequest->id,
                'schedule_id' => $schedule->id,
            ],
        );

        return Redirect::route('requests.show', $jobRequest);
    }
}
